using Amazon.CognitoIdentityProvider.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Exceptions;
using APIHandler.Helpers;
using APIHandler.Models.Registration;
using APIHandler.Services.Auth;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace APIHandler.Handlers;

public sealed class ConfirmRegistrationHandler : IApiRequestHandler
{
    private readonly IRegistrationService _registrationService;

    public ConfirmRegistrationHandler(IRegistrationService registrationService)
    {
        _registrationService = registrationService ?? throw new ArgumentNullException(nameof(registrationService));
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
            await _registrationService.ConfirmEmailAsync(body.Email, body.ConfirmationCode);
            return ResponseBuilder.CreateSuccessResponse("Email verified. You can now sign in.");
        }
        catch (CodeMismatchException)
        {
            return InvalidCodeResponse(context);
        }
        catch (ExpiredCodeException)
        {
            return InvalidCodeResponse(context);
        }
        catch (UserNotFoundException)
        {
            return InvalidCodeResponse(context);
        }
        catch (TooManyRequestsException)
        {
            return ResponseBuilder.CreateErrorResponse(429, "Too many confirmation attempts. Please try again later.", context.Logger);
        }
        catch (Exception)
        {
            context.Logger.LogLine("Email confirmation failed.");
            return ResponseBuilder.CreateErrorResponse(503, "Email confirmation is temporarily unavailable.", context.Logger);
        }
    }

    private static APIGatewayProxyResponse InvalidCodeResponse(ILambdaContext context) =>
        ResponseBuilder.CreateErrorResponse(400, "The confirmation code is invalid or expired.", context.Logger);

    private static bool TryDeserializeRequest(APIGatewayProxyRequest request, out ConfirmRegistrationRequest body)
    {
        try
        {
            var result = JsonSerializer.Deserialize<ConfirmRegistrationRequest>(request.Body);
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
