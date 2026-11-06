import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
      ],
    });
    service = TestBed.inject(PasswordResetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a reset without exposing whether the email is registered', () => {
    let completed = false;
    service.requestReset('person@example.com').subscribe(() => (completed = true));

    const request = http.expectOne('https://test.api/forgot-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'person@example.com' });
    request.flush({ message: 'If an account exists, instructions were sent.' });

    expect(completed).toBeTrue();
  });

  it('submits the email, one-time code, and new password to the confirmation endpoint', () => {
    let completed = false;
    service
      .resetPassword('person@example.com', '123456', 'StrongPass1!')
      .subscribe(() => (completed = true));

    const request = http.expectOne('https://test.api/reset-password');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'person@example.com',
      confirmationCode: '123456',
      newPassword: 'StrongPass1!',
    });
    request.flush({ message: 'Password reset successfully.' });

    expect(completed).toBeTrue();
  });
});
