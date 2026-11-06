import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError, filter, take, timeout } from 'rxjs/operators';

import { AuthenticationService } from '@app/auth/services/authentication.service';
import { LoginDraftService } from '@app/auth/services/login-draft.service';
import { CustomButtonComponent } from '@app/shared/custom-components/custom-button/custom-button.component';
import { UserModel } from '@app/auth/models/user.model';

@Component({
    selector: 'app-login-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, CustomButtonComponent],
    templateUrl: './login-form.component.html',
    styleUrl: './login-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
    // signals-first output
    readonly success = output<void>();

    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthenticationService);
    private readonly router = inject(Router);
    private readonly draftService = inject(LoginDraftService);

    // UI state as signals
    readonly showPassword = signal(false);
    readonly isLoading = signal(false);

    // API/UI error state
    readonly unsuccessfulLogin = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly isAccountLocked = computed(() => {
        const msg = (this.errorMessage() ?? '').toLowerCase();
        return msg.includes('locked') || msg.includes('too many') || msg.includes('try again in');
    });

    readonly loginForm = this.fb.group({
        email: [
            '',
            [
                Validators.required,
                Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
            ],
        ],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(16)]],
    });

    //derived template helpers
    readonly email = computed(() => this.loginForm.get('email'));
    readonly password = computed(() => this.loginForm.get('password'));

    constructor() {
        // restore draft once
        const draft = this.draftService.draft();
        this.loginForm.patchValue(draft, {emitEvent: false});

        // sync changes to draft
        effect(() => {
            // subscribe-like effect: whenever form changes, update service draft
            const v = this.loginForm.value;
            this.draftService.set({ email: v.email ?? '', password: v.password ?? ''}); 
        });
    }

    togglePassword() {
        this.showPassword.update((v) => !v);
    }

    async onSubmit(): Promise<void> {
        // clear API state each submit
        this.unsuccessfulLogin.set(false);
        this.errorMessage.set(null);

        if(this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);

        try {
            const { email, password } = this.loginForm.value;
            const result = await this.auth.signIn(email!, password!);

            if (!result.success) {
                this.unsuccessfulLogin.set(true);
                this.errorMessage.set(result.message || 'Unable to sign in. Please try again.');
                return;
            }

            this.draftService.clear();
            this.success.emit();

            const user = await firstValueFrom(
                this.auth.user$.pipe(
                    filter((candidate): candidate is UserModel => candidate !== null),
                    take(1),
                    timeout({ first: 3000 }),
                    catchError(() => of(null))
                )
            );
            if (user?.role === 'Waiter') this.router.navigate(['/waiter-reservations']);
            else if (user?.role === 'Admin') this.router.navigate(['/reports']);
            else this.router.navigate(['/main']);
        } catch {
            this.unsuccessfulLogin.set(true);
            this.errorMessage.set('Unable to connect to the server. Please check your connection and try again.');
        } finally {
            this.isLoading.set(false);
        }
    }
}