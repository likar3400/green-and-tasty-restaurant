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

public sealed class ResendRegistrationCodeHandler : IApiRequestHandler
{
    private readonly IRegistrationService _registrationService;

    public ResendRegistrationCodeHandler(IRegistrationService registrationService)
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
        }
        catch (ValidationException ex)
        {
            return ResponseBuilder.CreateErrorResponse(400, ex.Message, context.Logger);
        }

        try
        {
            await _registrationService.ResendConfirmationCodeAsync(body.Email);
            return ResponseBuilder.CreateSuccessResponse("If the account is awaiting email confirmation, a new code has been sent.");
        }
        catch (TooManyRequestsException)
        {
            return ResponseBuilder.CreateErrorResponse(429, "Too many code requests. Please try again later.", context.Logger);
        }
        catch (Exception)
        {
            context.Logger.LogLine("Confirmation code resend failed.");
            return ResponseBuilder.CreateErrorResponse(503, "Code resend is temporarily unavailable.", context.Logger);
        }
    }

    private static bool TryDeserializeRequest(APIGatewayProxyRequest request, out ResendRegistrationCodeRequest body)
    {
        try
        {
            var result = JsonSerializer.Deserialize<ResendRegistrationCodeRequest>(request.Body);
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
