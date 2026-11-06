import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthenticationService } from './authentication.service';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
      ],
    });
    service = TestBed.inject(AuthenticationService);
  });

  it('returns a visible failure when the sign-in request cannot reach the API', async () => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('offline')));

    const result = await service.signIn('guest@example.com', 'password123');

    expect(result.success).toBeFalse();
    expect(result.message).toContain('Unable to connect to the server');
  });

  it('returns the email confirmation requirement after registration', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(
        new Response(
          JSON.stringify({
            message: 'A confirmation code has been sent to your email address.',
            requiresEmailConfirmation: true,
            destination: 'p***@example.com',
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await service.register(
      'John',
      'Doe',
      'person@example.com',
      'StrongPass1!',
      'StrongPass1!',
    );

    expect(fetchSpy).toHaveBeenCalledOnceWith(
      'https://test.api/register',
      jasmine.objectContaining({ method: 'POST' }),
    );
    expect(result.requiresEmailConfirmation).toBeTrue();
    expect(result.destination).toBe('p***@example.com');
  });

  it('confirms a registration with the email code', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response(JSON.stringify({ message: 'Email verified.' }), { status: 200 })),
    );

    const result = await service.confirmRegistration('person@example.com', 'test-code');

    expect(fetchSpy).toHaveBeenCalledOnceWith(
      'https://test.api/confirm-registration',
      jasmine.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'person@example.com', confirmationCode: 'test-code' }),
      }),
    );
    expect(result.success).toBeTrue();
  });

  it('can resend the email confirmation code', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      Promise.resolve(new Response(JSON.stringify({ message: 'If eligible, a code has been sent.' }), { status: 200 })),
    );

    const result = await service.resendRegistrationCode('person@example.com');

    expect(fetchSpy).toHaveBeenCalledOnceWith(
      'https://test.api/resend-registration-code',
      jasmine.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'person@example.com' }),
      }),
    );
    expect(result.success).toBeTrue();
  });
});
