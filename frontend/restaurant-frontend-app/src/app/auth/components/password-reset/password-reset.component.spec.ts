import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { PasswordResetService } from '@app/auth/services/password-reset.service';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ResetPasswordComponent } from './reset-password.component';

describe('Password reset components', () => {
  let resetService: jasmine.SpyObj<PasswordResetService>;

  beforeEach(async () => {
    resetService = jasmine.createSpyObj('PasswordResetService', ['requestReset', 'resetPassword']);
    resetService.requestReset.and.returnValue(of(undefined));
    resetService.resetPassword.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, ResetPasswordComponent],
      providers: [
        FormBuilder,
        { provide: PasswordResetService, useValue: resetService },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
    })
      .overrideComponent(ForgotPasswordComponent, {
        set: { template: '', imports: [], styles: [], styleUrl: undefined },
      })
      .overrideComponent(ResetPasswordComponent, {
        set: { template: '', imports: [], styles: [], styleUrl: undefined },
      })
      .compileComponents();
  });

  it('does not request a reset for an invalid email', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const component = fixture.componentInstance;
    component.form.controls.email.setValue('not-an-email');

    component.submit();

    expect(component.form.controls.email.touched).toBeTrue();
    expect(resetService.requestReset).not.toHaveBeenCalled();
  });

  it('requests a reset and shows the generic completion state', () => {
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    const component = fixture.componentInstance;
    component.form.controls.email.setValue('person@example.com');

    component.submit();

    expect(resetService.requestReset).toHaveBeenCalledOnceWith('person@example.com');
    expect(component.submitted()).toBeTrue();
  });

  it('validates password policy and matching before sending a code', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'person@example.com',
      confirmationCode: '123456',
      newPassword: 'weakpass',
      confirmPassword: 'weakpass',
    });

    component.submit();

    expect(component.form.controls.newPassword.invalid).toBeTrue();
    expect(resetService.resetPassword).not.toHaveBeenCalled();

    component.form.setValue({
      email: 'person@example.com',
      confirmationCode: '123456',
      newPassword: 'StrongPass1!',
      confirmPassword: 'DifferentPass2!',
    });
    component.submit();

    expect(component.form.hasError('passwordMismatch')).toBeTrue();
    expect(resetService.resetPassword).not.toHaveBeenCalled();
  });

  it('submits the verified code and new password', () => {
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'person@example.com',
      confirmationCode: '123456',
      newPassword: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
    });

    component.submit();

    expect(resetService.resetPassword).toHaveBeenCalledOnceWith(
      'person@example.com',
      '123456',
      'StrongPass1!',
    );
    expect(component.completed()).toBeTrue();
  });
});
