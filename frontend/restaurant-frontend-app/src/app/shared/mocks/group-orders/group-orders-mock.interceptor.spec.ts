import { HttpErrorResponse, HttpEvent, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { createDemoTokens, getDemoUser, resetDemoUser } from '../auth/demo-auth';
import { DEMO_GROUP_ID } from './group-orders.mock-store';
import { groupOrdersMockInterceptor } from './group-orders-mock.interceptor';

describe('groupOrdersMockInterceptor guest flow', () => {
  const next = jasmine.createSpy<(request: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>>('next')
    .and.callFake(() => throwError(() => new Error('Request should not reach the live API.')));

  function request(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): { response?: HttpResponse<unknown>; error?: HttpErrorResponse } {
    let response: HttpResponse<unknown> | undefined;
    let error: HttpErrorResponse | undefined;
    const req = new HttpRequest(method, `https://api.example${path}`, body, {
      headers: new HttpHeaders(headers),
    });

    groupOrdersMockInterceptor(req, (forwardedRequest) => next(forwardedRequest)).subscribe({
      next: (event) => {
        if (event instanceof HttpResponse) response = event;
      },
      error: (requestError: HttpErrorResponse) => error = requestError,
    });
    tick(400);
    return { response, error };
  }

  beforeEach(() => {
    next.calls.reset();
    next.and.returnValue(throwError(() => new Error('Request should not reach the live API.')));
    resetDemoUser();
  });

  it('creates a local session, loads the supplied menu, updates the cart and submits without forwarding', fakeAsync(() => {
    const create = request('POST', '/guest/sessions', {
      groupReservationId: DEMO_GROUP_ID,
      guestName: 'Local Guest',
    });
    const session = create.response?.body as { SessionId: string; SessionToken: string };
    expect(session.SessionId).toMatch(/^gs-demo-guest-/);

    const headers = { Authorization: `Bearer ${session.SessionToken}` };
    const menu = request('GET', `/guest/sessions/${session.SessionId}/menu`, undefined, headers);
    const dishes = (menu.response?.body as { dishes: Record<string, { id: string; name: string }[]> }).dishes;
    expect(Object.values(dishes).flat().map((dish) => dish.name)).toContain('Spring Salad');

    const add = request('POST', `/guest/sessions/${session.SessionId}/dishes`, {
      dishId: 'demo-catalog-spring-salad',
      quantity: 2,
    }, headers);
    expect(add.response?.status).toBe(200);

    const remove = request('DELETE', `/guest/sessions/${session.SessionId}/dishes`, {
      dishId: 'demo-catalog-spring-salad',
      quantity: 1,
    }, headers);
    expect(remove.response?.status).toBe(200);

    const submit = request('POST', `/guest/sessions/${session.SessionId}/submit`, {}, headers);
    expect(submit.response?.status).toBe(200);
    expect(next).not.toHaveBeenCalled();
  }));

  it('requires the local guest session token and forwards other group IDs', fakeAsync(() => {
    const invalidSession = request('GET', '/guest/sessions/not-a-session/menu', undefined, {
      Authorization: 'Bearer invalid-token',
    });
    expect(invalidSession.error?.status).toBe(401);

    next.and.returnValue(of(new HttpResponse({ status: 200, body: 'forwarded' })));
    const nonDemo = request('POST', '/guest/sessions', {
      groupReservationId: 'live-group',
      guestName: 'Guest',
    });
    expect(nonDemo.response?.body).toBe('forwarded');
    expect(next).toHaveBeenCalled();
  }));

  it('updates and reloads the local demo profile without sending fake credentials to the API', fakeAsync(() => {
    const authorization = `Bearer ${createDemoTokens().idToken}`;
    const profile = request('PUT', '/me', { firstName: 'Local', lastName: 'Profile' }, { Authorization: authorization });
    expect(profile.response?.status).toBe(200);
    expect(getDemoUser()).toEqual(jasmine.objectContaining({ firstName: 'Local', lastName: 'Profile' }));

    const currentUser = request('GET', '/me', undefined, { Authorization: authorization });
    expect(currentUser.response?.body).toEqual(jasmine.objectContaining({ firstName: 'Local', lastName: 'Profile' }));
    expect(next).not.toHaveBeenCalled();
  }));

  it('keeps profile endpoints on the real API for non-demo users', fakeAsync(() => {
    next.and.returnValue(of(new HttpResponse({ status: 200, body: 'forwarded' })));
    const response = request('PUT', '/me', { firstName: 'Real', lastName: 'User' }, { Authorization: 'Bearer real-token' });
    expect(response.response?.body).toBe('forwarded');
    expect(next).toHaveBeenCalled();
  }));
});
