using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using APIHandler.Constants;
using APIHandler.Models.Users;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace APIHandler.Services.Auth;

public sealed class RegistrationService : IRegistrationService
{
    private readonly IAmazonCognitoIdentityProvider _cognitoClient;
    private readonly string _userPoolId;
    private readonly string _clientId;

    public RegistrationService(
        IAmazonCognitoIdentityProvider cognitoClient,
        string? userPoolId = null,
        string? clientId = null)
    {
        _cognitoClient = cognitoClient ?? throw new ArgumentNullException(nameof(cognitoClient));
        _userPoolId = userPoolId ?? ResourceNames.UserPoolId;
        _clientId = clientId ?? ResourceNames.ClientId;
    }

    public async Task<string?> RegisterAsync(string firstName, string lastName, string email, string password)
    {
        var response = await _cognitoClient.SignUpAsync(new SignUpRequest
        {
            ClientId = _clientId,
            Username = email.Trim().ToLowerInvariant(),
            Password = password,
            UserAttributes =
            [
                new AttributeType { Name = "email", Value = email.Trim() },
                new AttributeType { Name = "given_name", Value = firstName },
                new AttributeType { Name = "family_name", Value = lastName }
            ]
        });

        return response.CodeDeliveryDetails?.Destination;
    }

    public async Task ConfirmEmailAsync(string email, string confirmationCode)
    {
        var username = email.Trim().ToLowerInvariant();
        await _cognitoClient.ConfirmSignUpAsync(new ConfirmSignUpRequest
        {
            ClientId = _clientId,
            Username = username,
            ConfirmationCode = confirmationCode
        });

        await EnsureCustomerGroupExistsAsync();
        await _cognitoClient.AdminAddUserToGroupAsync(new AdminAddUserToGroupRequest
        {
            UserPoolId = _userPoolId,
            Username = username,
            GroupName = Roles.Customer.ToString()
        });
    }

    public async Task ResendConfirmationCodeAsync(string email)
    {
        try
        {
            await _cognitoClient.ResendConfirmationCodeAsync(new ResendConfirmationCodeRequest
            {
                ClientId = _clientId,
                Username = email.Trim().ToLowerInvariant()
            });
        }
        catch (UserNotFoundException)
        {
        }
        catch (InvalidParameterException)
        {
        }
    }

    private async Task EnsureCustomerGroupExistsAsync()
    {
        var groupName = Roles.Customer.ToString();
        var groups = await _cognitoClient.ListGroupsAsync(new ListGroupsRequest
        {
            UserPoolId = _userPoolId
        });

        if (groups.Groups?.Any(group => string.Equals(group.GroupName, groupName, StringComparison.OrdinalIgnoreCase)) != true)
        {
            try
            {
                await _cognitoClient.CreateGroupAsync(new CreateGroupRequest
                {
                    UserPoolId = _userPoolId,
                    GroupName = groupName,
                    Description = $"Group for role {groupName}"
                });
            }
            catch (GroupExistsException)
            {
            }
        }
    }
}
