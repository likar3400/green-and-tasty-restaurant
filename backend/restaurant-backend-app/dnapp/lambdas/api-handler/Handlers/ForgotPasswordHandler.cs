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

public sealed class ForgotPasswordHandler : IApiRequestHandler
{
    private const string PublicMessage =
        "If an account exists with a verified email address, password reset instructions have been sent.";

    private readonly IPasswordResetService _passwordResetService;

    public ForgotPasswordHandler(IPasswordResetService passwordResetService)
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
        }
        catch (ValidationException ex)
        {
            return ResponseBuilder.CreateErrorResponse(400, ex.Message, context.Logger);
        }

        try
        {
            await _passwordResetService.RequestResetAsync(body.Email);
            return ResponseBuilder.CreateSuccessResponse(PublicMessage);
        }
        catch (TooManyRequestsException)
        {
            return ResponseBuilder.CreateErrorResponse(429, "Too many reset requests. Please try again later.", context.Logger);
        }
        catch (Exception)
        {
            context.Logger.LogLine("Password reset request failed.");
            return ResponseBuilder.CreateErrorResponse(503, "Password reset is temporarily unavailable.", context.Logger);
        }
    }

    private static bool TryDeserializeRequest(APIGatewayProxyRequest request, out APIHandler.Models.PasswordReset.ForgotPasswordRequest body)
    {
        try
        {
            var result = JsonSerializer.Deserialize<APIHandler.Models.PasswordReset.ForgotPasswordRequest>(request.Body);
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
