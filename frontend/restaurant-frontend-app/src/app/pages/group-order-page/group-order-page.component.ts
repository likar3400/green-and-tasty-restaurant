import { DatePipe, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Subscription, catchError, defer, exhaustMap, finalize, forkJoin, switchMap, tap, timer } from 'rxjs';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';
import { GroupReservationStatus } from '@app/models/group-orders/group-status.model';
import { Participant } from '@app/models/group-orders/participant.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';
import { consolidatePreOrder } from '@app/shared/helpers/consolidate-pre-order';

/** Як часто підтягувати свіжі кошики, поки група Open. */
const SYNC_INTERVAL_MS = 15_000;

type ScreenError = 'not-found' | 'failed';

@Component({
  selector: 'app-group-order-page',
  imports: [CurrencyPipe, DatePipe, ModalComponent, ParticipantCardComponent],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(GroupOrdersService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private reservationId = '';
  private syncSubscription: Subscription | null = null;
  private syncInFlight = false;

  // --- стан екрана ---
  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly ownerSessionId = signal('');
  readonly status = signal<GroupReservationStatus>('Open');
  readonly loading = signal(true);
  readonly screenError = signal<ScreenError | null>(null);

  readonly lastUpdated = signal<Date | null>(null);
  readonly syncFailed = signal(false);
  readonly refreshing = signal(false);

  readonly submitDialogOpen = signal(false);
  readonly submitting = signal(false);
  readonly guestToRemove = signal<Participant | null>(null);
  readonly removing = signal(false);

  // --- похідні значення ---
  readonly groupId = computed(() => this.invite()?.GroupReservationId ?? '');
  readonly consolidated = computed(() => consolidatePreOrder(this.participants()));
  /** Grand Total — лише підтверджені кошики, а не `total` з API. */
  readonly grandTotal = computed(() => this.consolidated().total);
  readonly pendingCount = computed(() => this.participants().filter((person) => !person.isSubmitted).length);
  readonly pendingMessage = computed(() => {
    const count = this.pendingCount();
    const subject = count === 1 ? '1 participant hasn’t' : `${count} participants haven’t`;
    return `${subject} submitted their cart yet — their dishes won’t be included in the order`;
  });
  readonly hasAnyDishes = computed(() => this.participants().some((person) => person.items.length > 0));
  readonly isOpen = computed(() => this.status() === 'Open');
  readonly statusLabel = computed(() => (this.isOpen() ? 'Collecting pre-orders' : 'Sent to Restaurant'));
  readonly canSubmit = computed(
    () => this.isOpen() && !this.submitting() && this.consolidated().items.length > 0,
  );

  ngOnInit(): void {
    this.reservationId = this.route.snapshot.paramMap.get('reservationId') ?? '';
    this.load();
  }

  /** Перше завантаження і «Try again». */
  load(): void {
    this.stopSync();
    this.loading.set(true);
    this.screenError.set(null);

    this.service
      .getGroupInvite$(this.reservationId)
      .pipe(
        switchMap((invite) =>
          forkJoin({
            invite: [invite],
            sessions: this.service.getSessions$(invite.GroupReservationId),
            ownerSessionId: this.service.getOwnerSessionId$(this.reservationId),
            groupStatus: this.service.getStatus$(invite.GroupReservationId),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ invite, sessions, ownerSessionId, groupStatus }) => {
          this.invite.set(invite);
          this.participants.set(sessions.participants);
          this.ownerSessionId.set(ownerSessionId);
          this.status.set(groupStatus.status);
          this.lastUpdated.set(new Date());
          this.syncFailed.set(false);
          this.loading.set(false);
          this.startSync();
        },
        error: (error: HttpErrorResponse) => {
          this.screenError.set(error.status === 404 ? 'not-found' : 'failed');
          this.loading.set(false);
        },
      });
  }

  /** Кнопка Refresh: синхронізуватись зараз. */
  refresh(): void {
    this.syncNow$().subscribe();
  }

  // --- Submit ---
  openSubmitDialog(): void {
    if (this.canSubmit()) this.submitDialogOpen.set(true);
  }

  closeSubmitDialog(): void {
    if (!this.submitting()) this.submitDialogOpen.set(false);
  }

  confirmSubmit(): void {
    if (this.submitting() || !this.canSubmit()) return;
    this.submitting.set(true);

    this.service
      .submit$(this.groupId(), this.reservationId)
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.status.set('Submitted');
          this.stopSync();
          this.submitDialogOpen.set(false);
          this.toast.success('Pre-order sent to the restaurant');
        },
        // toast з помилкою вже показав tokenInterceptor — тут лише закриваємо діалог
        error: () => this.submitDialogOpen.set(false),
      });
  }

  // --- Remove Guest ---
  askRemoveGuest(person: Participant): void {
    this.guestToRemove.set(person);
  }

  closeRemoveDialog(): void {
    if (!this.removing()) this.guestToRemove.set(null);
  }

  confirmRemoveGuest(): void {
    const person = this.guestToRemove();
    if (!person || this.removing()) return;
    this.removing.set(true);

    this.service
      .removeSession$(this.groupId(), person.id)
      .pipe(
        finalize(() => this.removing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        // список і суми оновлюються з відповіді сервера — через ті самі computed()
        next: (snapshot) => {
          this.participants.set(snapshot.participants);
          this.guestToRemove.set(null);
          this.toast.success(`${person.name} was removed from the reservation`);
        },
        error: () => this.guestToRemove.set(null),
      });
  }

  // --- фонова синхронізація ---
  private startSync(): void {
    this.stopSync(); // таймер не плодиться
    if (!this.isOpen()) return;

    this.syncSubscription = timer(SYNC_INTERVAL_MS, SYNC_INTERVAL_MS)
      .pipe(
        // якщо попередній запит ще не відповів, новий не стартує
        exhaustMap(() => this.syncNow$()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private stopSync(): void {
    this.syncSubscription?.unsubscribe();
    this.syncSubscription = null;
  }

  /** Тихий запит свіжих кошиків і статусу. Помилка не ламає екран і не зупиняє таймер. */
  private syncNow$() {
    return defer(() => {
      if (this.syncInFlight || !this.isOpen()) return EMPTY;
      this.syncInFlight = true;
      this.refreshing.set(true);
      const groupId = this.groupId();

      return forkJoin({
        sessions: this.service.getSessions$(groupId, { silent: true }),
        groupStatus: this.service.getStatus$(groupId, { silent: true }),
      }).pipe(
        tap(({ sessions, groupStatus }) => {
          this.participants.set(sessions.participants);
          this.status.set(groupStatus.status);
          this.lastUpdated.set(new Date());
          this.syncFailed.set(false);
          if (groupStatus.status !== 'Open') this.stopSync();
        }),
        catchError(() => {
          this.syncFailed.set(true);
          return EMPTY;
        }),
        finalize(() => {
          this.syncInFlight = false;
          this.refreshing.set(false);
        }),
      );
    });
  }
}
