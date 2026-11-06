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
});
