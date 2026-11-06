using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using APIHandler.Constants;
using System;
using System.Threading.Tasks;

namespace APIHandler.Services.Auth;

public sealed class PasswordResetService : IPasswordResetService
{
    private readonly IAmazonCognitoIdentityProvider _cognitoClient;
    private readonly string _clientId;

    public PasswordResetService(IAmazonCognitoIdentityProvider cognitoClient, string? clientId = null)
    {
        _cognitoClient = cognitoClient ?? throw new ArgumentNullException(nameof(cognitoClient));
        _clientId = clientId ?? ResourceNames.ClientId;
    }

    public async Task RequestResetAsync(string email)
    {
        try
        {
            await _cognitoClient.ForgotPasswordAsync(new ForgotPasswordRequest
            {
                ClientId = _clientId,
                Username = email.Trim().ToLowerInvariant()
            });
        }
        catch (UserNotFoundException)
        {
            // Return the same public response for existing and unknown accounts.
        }
        catch (InvalidParameterException)
        {
            // Cognito also uses this when no verified recovery destination is available.
        }
    }

    public async Task ResetPasswordAsync(string email, string confirmationCode, string newPassword)
    {
        await _cognitoClient.ConfirmForgotPasswordAsync(new ConfirmForgotPasswordRequest
        {
            ClientId = _clientId,
            Username = email.Trim().ToLowerInvariant(),
            ConfirmationCode = confirmationCode,
            Password = newPassword
        });
    }
}
