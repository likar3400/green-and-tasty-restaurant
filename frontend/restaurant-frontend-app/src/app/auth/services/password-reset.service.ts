import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);

  requestReset(email: string): Observable<void> {
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email })
      .pipe(map(() => undefined));
  }

  resetPassword(
    email: string,
    confirmationCode: string,
    newPassword: string,
  ): Observable<void> {
    return this.http
      .post<{ message: string }>(`${this.baseUrl}/reset-password`, {
        email,
        confirmationCode,
        newPassword,
      })
      .pipe(map(() => undefined));
  }
}
