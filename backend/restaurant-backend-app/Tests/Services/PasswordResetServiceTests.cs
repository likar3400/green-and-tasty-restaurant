using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using APIHandler.Services.Auth;
using Moq;
using System.Threading;
using System.Threading.Tasks;

namespace APIHandler.Tests.Services;

public class PasswordResetServiceTests
{
    private readonly Mock<IAmazonCognitoIdentityProvider> _cognito = new();
    private readonly PasswordResetService _service;

    public PasswordResetServiceTests()
    {
        _service = new PasswordResetService(_cognito.Object, "test-client-id");
    }

    [Fact]
    public async Task RequestResetAsync_SendsCognitoResetRequestWithNormalizedEmail()
    {
        _cognito
            .Setup(client => client.ForgotPasswordAsync(
                It.IsAny<ForgotPasswordRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ForgotPasswordResponse());

        await _service.RequestResetAsync("  USER@example.com ");

        _cognito.Verify(client => client.ForgotPasswordAsync(
            It.Is<ForgotPasswordRequest>(request =>
                request.ClientId == "test-client-id" &&
                request.Username == "user@example.com"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RequestResetAsync_ConsumesUnknownUserWithoutChangingPublicFlow()
    {
        _cognito
            .Setup(client => client.ForgotPasswordAsync(
                It.IsAny<ForgotPasswordRequest>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UserNotFoundException("not found"));

        await _service.RequestResetAsync("unknown@example.com");
    }

    [Fact]
    public async Task RequestResetAsync_ConsumesUserWithoutVerifiedRecoveryDestination()
    {
        _cognito
            .Setup(client => client.ForgotPasswordAsync(
                It.IsAny<ForgotPasswordRequest>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidParameterException("no verified destination"));

        await _service.RequestResetAsync("unverified@example.com");
    }

    [Fact]
    public async Task ResetPasswordAsync_ConfirmsCodeWithCognito()
    {
        _cognito
            .Setup(client => client.ConfirmForgotPasswordAsync(
                It.IsAny<ConfirmForgotPasswordRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ConfirmForgotPasswordResponse());

        await _service.ResetPasswordAsync("USER@example.com", "123456", "StrongPass1!");

        _cognito.Verify(client => client.ConfirmForgotPasswordAsync(
            It.Is<ConfirmForgotPasswordRequest>(request =>
                request.ClientId == "test-client-id" &&
                request.Username == "user@example.com" &&
                request.ConfirmationCode == "123456" &&
                request.Password == "StrongPass1!"),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
