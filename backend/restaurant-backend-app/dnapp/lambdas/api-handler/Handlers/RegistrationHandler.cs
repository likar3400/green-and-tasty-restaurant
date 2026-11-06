using Amazon.CognitoIdentityProvider.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Exceptions;
using APIHandler.Helpers;
using APIHandler.Models;
using APIHandler.Services.Auth;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace APIHandler.Handlers;

public sealed class RegistrationHandler : IApiRequestHandler
{
    private readonly IRegistrationService _registrationService;

    public RegistrationHandler(IRegistrationService registrationService)
    {
        _registrationService = registrationService ?? throw new ArgumentNullException(nameof(registrationService));
    }

    public async Task<APIGatewayProxyResponse> HandleRequest(APIGatewayProxyRequest request, ILambdaContext context)
    {
        if (!TryDeserializeRequest(request, out var registrationRequest))
        {
            return ResponseBuilder.CreateErrorResponse(400, "Invalid request body", context.Logger);
        }

        try
        {
            PersonalDataValidator.ValidateName(registrationRequest.FirstName, "First name");
            PersonalDataValidator.ValidateName(registrationRequest.LastName, "Last name");
            PersonalDataValidator.ValidateEmail(registrationRequest.Email);
            PersonalDataValidator.ValidatePasswords(registrationRequest.Password, registrationRequest.ConfirmPassword);
        }
        catch (ValidationException ex)
        {
            return ResponseBuilder.CreateErrorResponse(400, ex.Message, context.Logger);
        }

        try
        {
            var destination = await _registrationService.RegisterAsync(
                registrationRequest.FirstName,
                registrationRequest.LastName,
                registrationRequest.Email,
                registrationRequest.Password);

            return ResponseBuilder.CreateJsonResponse(200, new
            {
                message = "A confirmation code has been sent to your email address.",
                requiresEmailConfirmation = true,
                destination
            });
        }
        catch (UsernameExistsException)
        {
            return ResponseBuilder.CreateErrorResponse(409, "An account with this email already exists.", context.Logger);
        }
        catch (LimitExceededException)
        {
            return ResponseBuilder.CreateErrorResponse(429, "Too many registration attempts. Please try again later.", context.Logger);
        }
        catch (Exception)
        {
            context.Logger.LogLine("User registration failed.");
            return ResponseBuilder.CreateErrorResponse(503, "Registration is temporarily unavailable.", context.Logger);
        }
    }

    private static bool TryDeserializeRequest(APIGatewayProxyRequest request, out RegistrationRequest body)
    {
        try
        {
            var result = JsonSerializer.Deserialize<RegistrationRequest>(request.Body);
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
