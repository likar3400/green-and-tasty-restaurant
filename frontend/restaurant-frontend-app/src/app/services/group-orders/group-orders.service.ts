import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { SKIP_ERROR_TOAST } from '@app/auth/skip-error-toast.context';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { GroupStatusResponse } from '@app/models/group-orders/group-status.model';
import { OwnerSessionResponse } from '@app/models/group-orders/owner-session.model';
import { SubmitGroupPreOrderRequest, SubmittedDish } from '@app/models/group-orders/submit-group-pre-order.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { GuestInviteService } from '../reservation/guest-invite.service';

/** `silent: true` — фонові запити: помилка не показує toast (його вирішує сама сторінка). */
export interface GroupRequestOptions {
  silent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GroupOrdersService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);
  private readonly inviteService = inject(GuestInviteService);

  /** reservationId → invite-token → дані запрошення (з GroupReservationId і даними для шапки). */
  getGroupInvite$(reservationId: string): Observable<GuestInvite> {
    return this.inviteService
      .getInviteToken$(reservationId)
      .pipe(switchMap((response) => this.inviteService.getInvite$(response.token)));
  }

  getSessions$(groupReservationId: string, options?: GroupRequestOptions): Observable<GroupSessionsResponse> {
    return this.http.get<GroupSessionsResponse>(this.sessionsUrl(groupReservationId), this.requestOptions(options));
  }

  getOwnerSessionId$(reservationId: string): Observable<string> {
    return this.http
      .get<OwnerSessionResponse>(`${this.baseUrl}/reservations/${encodeURIComponent(reservationId)}/guest-session-id`)
      .pipe(map((response) => response.guestSessionId));
  }

  getStatus$(groupReservationId: string, options?: GroupRequestOptions): Observable<GroupStatusResponse> {
    return this.http.get<GroupStatusResponse>(
      `${this.baseUrl}/guest/groups/${encodeURIComponent(groupReservationId)}/status`,
      this.requestOptions(options),
    );
  }

  submit$(groupReservationId: string, reservationId: string): Observable<SubmittedDish[]> {
    const body: SubmitGroupPreOrderRequest = { reservationId };
    return this.http.post<SubmittedDish[]>(
      `${this.baseUrl}/group-reservations/${encodeURIComponent(groupReservationId)}/submit`,
      body,
    );
  }

  /** Відповідь — той самий формат, що й у getSessions$ (оновлений snapshot групи). */
  removeSession$(groupReservationId: string, guestSessionId: string): Observable<GroupSessionsResponse> {
    return this.http.delete<GroupSessionsResponse>(
      `${this.sessionsUrl(groupReservationId)}/${encodeURIComponent(guestSessionId)}`,
    );
  }

  private sessionsUrl(groupReservationId: string): string {
    return `${this.baseUrl}/guest/groups/${encodeURIComponent(groupReservationId)}/sessions`;
  }

  private requestOptions(options?: GroupRequestOptions): { context: HttpContext } {
    return { context: new HttpContext().set(SKIP_ERROR_TOAST, options?.silent === true) };
  }
}
