export interface LoginResult {
  success: boolean;
  message?: string;
  requiresEmailConfirmation?: boolean;
  destination?: string;
}
