import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PasswordResetService } from '@app/auth/services/password-reset.service';
import { CustomButtonComponent } from '@app/shared/custom-components/custom-button/custom-button.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CustomButtonComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './password-reset.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly passwordResetService = inject(PasswordResetService);

  readonly isLoading = signal(false);
  readonly completed = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      confirmationCode: ['', [Validators.required, Validators.maxLength(128)]],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(16),
          Validators.pattern(/[a-z]/),
          Validators.pattern(/[A-Z]/),
          Validators.pattern(/[0-9]/),
          Validators.pattern(/[^a-zA-Z0-9\s]/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: (control) =>
        control.get('newPassword')?.value === control.get('confirmPassword')?.value
          ? null
          : { passwordMismatch: true },
    },
  );

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, confirmationCode, newPassword } = this.form.getRawValue();
    this.isLoading.set(true);
    this.passwordResetService
      .resetPassword(email, confirmationCode, newPassword)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.completed.set(true),
        error: () => this.error.set('The code is invalid or expired, or the password does not meet the requirements.'),
      });
  }
}
