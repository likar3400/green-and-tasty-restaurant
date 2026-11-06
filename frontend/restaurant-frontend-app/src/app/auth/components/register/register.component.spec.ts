import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterComponent } from './register.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { AuthenticationService } from '@app/auth/services/authentication.service';
import { FormValidatorsService } from '@app/auth/services/form-validators-service.service';
import { provideRouter, Router } from '@angular/router';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let auth: jasmine.SpyObj<AuthenticationService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthenticationService', [
      'register',
      'confirmRegistration',
      'resendRegistrationCode',
    ]);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: AuthenticationService, useValue: auth },
        { provide: FormValidatorsService, useValue: new FormValidatorsService() },
      ],
      imports: [RegisterComponent],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requires email confirmation before navigating to sign in', async () => {
    auth.register.and.resolveTo({
      success: true,
      requiresEmailConfirmation: true,
      message: 'A confirmation code has been sent.',
    });
    component.registerForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'person@example.com',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
    });

    await component.onSubmit();

    expect(component.awaitingEmailConfirmation()).toBeTrue();
    expect(component.registeredEmail()).toBe('person@example.com');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('confirms email before allowing the user to sign in', async () => {
    auth.confirmRegistration.and.resolveTo({ success: true, message: 'Email verified.' });
    component.awaitingEmailConfirmation.set(true);
    component.registeredEmail.set('person@example.com');
    component.confirmationCode.setValue('one-time-code');

    await component.confirmEmail();

    expect(auth.confirmRegistration).toHaveBeenCalledOnceWith('person@example.com', 'one-time-code');
    expect(component.emailConfirmed()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('offers resend confirmation code for an awaiting account', async () => {
    auth.resendRegistrationCode.and.resolveTo({
      success: true,
      message: 'If the account is awaiting email confirmation, a new code has been sent.',
    });
    component.awaitingEmailConfirmation.set(true);
    component.registeredEmail.set('person@example.com');

    await component.resendConfirmationCode();

    expect(auth.resendRegistrationCode).toHaveBeenCalledOnceWith('person@example.com');
    expect(component.confirmationMessage()).toContain('new code has been sent');
  });
});
