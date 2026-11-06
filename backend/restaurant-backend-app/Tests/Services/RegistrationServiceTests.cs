using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using APIHandler.Services.Auth;
using Moq;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace APIHandler.Tests.Services;

public class RegistrationServiceTests
{
    private readonly Mock<IAmazonCognitoIdentityProvider> _cognito = new();
    private readonly RegistrationService _service;

    public RegistrationServiceTests()
    {
        _service = new RegistrationService(_cognito.Object, "pool", "client");
    }

    [Fact]
    public async Task RegisterAsyncSendsConfirmationCodeWithoutAutoConfirmingUser()
    {
        _cognito
            .Setup(client => client.SignUpAsync(It.IsAny<SignUpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SignUpResponse
            {
                CodeDeliveryDetails = new CodeDeliveryDetailsType { Destination = "p***@example.com" }
            });

        var destination = await _service.RegisterAsync("John", "Doe", "Person@example.com", "StrongPass1!");

        Assert.Equal("p***@example.com", destination);
        _cognito.Verify(client => client.SignUpAsync(
            It.Is<SignUpRequest>(request =>
                request.ClientId == "client" &&
                request.Username == "person@example.com" &&
                request.Password == "StrongPass1!"),
            It.IsAny<CancellationToken>()), Times.Once);
        _cognito.Verify(client => client.AdminConfirmSignUpAsync(
            It.IsAny<AdminConfirmSignUpRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ConfirmEmailAsyncConfirmsCodeAndAssignsCustomerRole()
    {
        _cognito
            .Setup(client => client.ConfirmSignUpAsync(
                It.IsAny<ConfirmSignUpRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ConfirmSignUpResponse());
        _cognito
            .Setup(client => client.ListGroupsAsync(
                It.IsAny<ListGroupsRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ListGroupsResponse { Groups = new List<GroupType>() });
        _cognito
            .Setup(client => client.CreateGroupAsync(
                It.IsAny<CreateGroupRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CreateGroupResponse());
        _cognito
            .Setup(client => client.AdminAddUserToGroupAsync(
                It.IsAny<AdminAddUserToGroupRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminAddUserToGroupResponse());

        await _service.ConfirmEmailAsync("Person@example.com", "123456");

        _cognito.Verify(client => client.ConfirmSignUpAsync(
            It.Is<ConfirmSignUpRequest>(request =>
                request.ClientId == "client" &&
                request.Username == "person@example.com" &&
                request.ConfirmationCode == "123456"),
            It.IsAny<CancellationToken>()), Times.Once);
        _cognito.Verify(client => client.AdminAddUserToGroupAsync(
            It.Is<AdminAddUserToGroupRequest>(request =>
                request.UserPoolId == "pool" &&
                request.Username == "person@example.com" &&
                request.GroupName == "Customer"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ResendConfirmationCodeAsyncSuppressesUnknownUser()
    {
        _cognito
            .Setup(client => client.ResendConfirmationCodeAsync(
                It.IsAny<ResendConfirmationCodeRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UserNotFoundException("not found"));

        await _service.ResendConfirmationCodeAsync("unknown@example.com");
    }
}
