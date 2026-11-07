import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GuestInviteService } from '@app/services/reservation/guest-invite.service';
import { GuestSessionsService } from '@app/services/guest-sessions/guest-sessions.service';
import { GuestPreorderStore } from './guest-preorder.store';
import { DEMO_INVITE_TOKEN } from '@app/shared/mocks/group-orders/group-orders.mock-store';

describe('GuestPreorderStore', () => {
  let store: GuestPreorderStore;
  let guestSessionsService: jasmine.SpyObj<GuestSessionsService>;

  beforeEach(() => {
    const guestInviteService = jasmine.createSpyObj<GuestInviteService>('GuestInviteService', ['getInvite$']);
    guestSessionsService = jasmine.createSpyObj<GuestSessionsService>(
      'GuestSessionsService',
      ['createSession', 'getMenu', 'addDish', 'removeDish', 'submit']
    );

    guestInviteService.getInvite$.and.returnValue(of({
      GroupReservationId: 'group-1',
      LocationId: 'location-1',
      RestaurantName: 'Green & Tasty',
      LocationAddress: '1 Main Street',
      StartTime: '2026-11-07T18:00:00Z',
      EndTime: '2026-11-07T20:00:00Z',
      MaxGuestCount: 4,
      TableNumber: 2,
      InviterName: 'Alex',
    }));

    TestBed.configureTestingModule({
      providers: [
        GuestPreorderStore,
        { provide: GuestInviteService, useValue: guestInviteService },
        { provide: GuestSessionsService, useValue: guestSessionsService },
      ],
    });

    store = TestBed.inject(GuestPreorderStore);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('keeps the name form available when joining a guest session fails', async () => {
    guestSessionsService.createSession.and.returnValue(throwError(() => new Error('offline')));
    store.invite.set({
      GroupReservationId: 'group-1',
      LocationId: 'location-1',
      RestaurantName: 'Green & Tasty',
      LocationAddress: '1 Main Street',
      StartTime: '2026-11-07T18:00:00Z',
      EndTime: '2026-11-07T20:00:00Z',
      MaxGuestCount: 4,
      TableNumber: 2,
      InviterName: 'Alex',
    });

    await store.join('Guest Name');

    expect(guestSessionsService.createSession).toHaveBeenCalledWith({
      groupReservationId: 'group-1',
      guestName: 'Guest Name',
    });
    expect(store.guestName()).toBe('');
    expect(store.joinError()).toBe('Failed to join session');
    expect(store.joinLoading()).toBeFalse();
  });

  it('removes persisted guest session credentials after successful submission', () => {
    store.initContext('invite-token');
    localStorage.setItem('guestPreorder:invite-token:guestSessionId', 'session-1');
    localStorage.setItem('guestPreorder:invite-token:guestSessionToken', 'session-token');
    localStorage.setItem('guestPreorder:invite-token:guestName', 'Guest Name');
    localStorage.setItem('guestPreorder:invite-token:cart', '[]');

    store.submitSuccess();

    expect(store.status()).toBe('submitted');
    expect(localStorage.getItem('guestPreorder:invite-token:guestSessionId')).toBeNull();
    expect(localStorage.getItem('guestPreorder:invite-token:guestSessionToken')).toBeNull();
    expect(localStorage.getItem('guestPreorder:invite-token:guestName')).toBeNull();
    expect(localStorage.getItem('guestPreorder:invite-token:cart')).toBeNull();
  });

  it('does not reuse or persist the in-memory local demo guest session across reloads', () => {
    localStorage.setItem(`guestPreorder:${DEMO_INVITE_TOKEN}:guestName`, 'Old Guest');
    localStorage.setItem(`guestPreorder:${DEMO_INVITE_TOKEN}:guestSessionId`, 'stale-session');
    localStorage.setItem(`guestPreorder:${DEMO_INVITE_TOKEN}:guestSessionToken`, 'stale-token');
    localStorage.setItem(`guestPreorder:${DEMO_INVITE_TOKEN}:cart`, '[]');

    store.initContext(DEMO_INVITE_TOKEN);

    expect(store.guestName()).toBe('');
    expect(store.guestSessionId()).toBeNull();
    expect(store.guestSessionToken()).toBeNull();
    expect(localStorage.getItem(`guestPreorder:${DEMO_INVITE_TOKEN}:guestName`)).toBeNull();
    expect(localStorage.getItem(`guestPreorder:${DEMO_INVITE_TOKEN}:guestSessionId`)).toBeNull();
    expect(localStorage.getItem(`guestPreorder:${DEMO_INVITE_TOKEN}:guestSessionToken`)).toBeNull();
    expect(localStorage.getItem(`guestPreorder:${DEMO_INVITE_TOKEN}:cart`)).toBeNull();
  });
});
