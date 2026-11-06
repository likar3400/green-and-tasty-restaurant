using Amazon.CognitoIdentityProvider.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Exceptions;
using APIHandler.Helpers;
using APIHandler.Models.PasswordReset;
using APIHandler.Services.Auth;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace APIHandler.Handlers;

public sealed class ResetPasswordHandler : IApiRequestHandler
{
    private readonly IPasswordResetService _passwordResetService;

    public ResetPasswordHandler(IPasswordResetService passwordResetService)
    {
        _passwordResetService = passwordResetService ?? throw new ArgumentNullException(nameof(passwordResetService));
    }

    public async Task<APIGatewayProxyResponse> HandleRequest(APIGatewayProxyRequest request, ILambdaContext context)
    {
        if (!TryDeserializeRequest(request, out var body))
        {
            return ResponseBuilder.CreateErrorResponse(400, "Invalid request body", context.Logger);
        }

        try
        {
            PersonalDataValidator.ValidateEmail(body.Email);
            PersonalDataValidator.ValidatePasswordForReset(body.NewPassword);
            if (string.IsNullOrWhiteSpace(body.ConfirmationCode) || body.ConfirmationCode.Length > 128)
            {
                throw new ValidationException("A valid confirmation code is required.");
            }
        }
        catch (ValidationException ex)
        {
            return ResponseBuilder.CreateErrorResponse(400, ex.Message, context.Logger);
        }

        try
        {
            await _passwordResetService.ResetPasswordAsync(body.Email, body.ConfirmationCode, body.NewPassword);
            return ResponseBuilder.CreateSuccessResponse("Password reset successfully.");
        }
        catch (CodeMismatchException)
        {
            return InvalidResetResponse(context);
        }
        catch (ExpiredCodeException)
        {
            return InvalidResetResponse(context);
        }
        catch (InvalidPasswordException)
        {
            return InvalidResetResponse(context);
        }
        catch (UserNotFoundException)
        {
            return InvalidResetResponse(context);
        }
        catch (TooManyRequestsException)
        {
            return ResponseBuilder.CreateErrorResponse(429, "Too many reset attempts. Please try again later.", context.Logger);
        }
        catch (Exception)
        {
            context.Logger.LogLine("Password reset confirmation failed.");
            return ResponseBuilder.CreateErrorResponse(503, "Password reset is temporarily unavailable.", context.Logger);
        }
    }

    private static APIGatewayProxyResponse InvalidResetResponse(ILambdaContext context) =>
        ResponseBuilder.CreateErrorResponse(400, "The reset code is invalid or expired, or the password does not meet the requirements.", context.Logger);

    private static bool TryDeserializeRequest(APIGatewayProxyRequest request, out ResetPasswordRequest body)
    {
        try
        {
            var result = JsonSerializer.Deserialize<ResetPasswordRequest>(request.Body);
            if (result is null)
            {
                body = null!;
                return false;
            }

            body = result;
            return true;
        }
        catch (Exception ex) when (ex is JsonException or ArgumentNullException)
        {
            body = null!;
            return false;
        }
    }
}
