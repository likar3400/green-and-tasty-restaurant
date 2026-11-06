import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CustomButtonComponent } from '@app/shared/custom-components/custom-button/custom-button.component';
import { PasswordResetService } from '@app/auth/services/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CustomButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './password-reset.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly passwordResetService = inject(PasswordResetService);

  readonly isLoading = signal(false);
  readonly submitted = signal(false);
  readonly error = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  submit(): void {
    this.error.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.passwordResetService
      .requestReset(this.form.getRawValue().email)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => this.submitted.set(true),
        error: () => this.error.set(true),
      });
  }
}
