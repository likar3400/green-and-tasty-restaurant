using Amazon.CognitoIdentityProvider.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Handlers;
using APIHandler.Services.Auth;
using Moq;
using System.Text.Json;
using System.Threading.Tasks;

namespace APIHandler.Tests.Handlers;

public class PasswordResetHandlerTests
{
    private readonly Mock<IPasswordResetService> _service = new();
    private readonly Mock<ILambdaContext> _context = new();
    private readonly Mock<ILambdaLogger> _logger = new();

    public PasswordResetHandlerTests()
    {
        _context.Setup(context => context.Logger).Returns(_logger.Object);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsSameGenericSuccessForUnknownEmail()
    {
        _service
            .Setup(service => service.RequestResetAsync("unknown@example.com"))
            .Returns(Task.CompletedTask);
        var handler = new ForgotPasswordHandler(_service.Object);

        var response = await handler.HandleRequest(new APIGatewayProxyRequest
        {
            Body = JsonSerializer.Serialize(new { email = "unknown@example.com" })
        }, _context.Object);

        Assert.Equal(200, response.StatusCode);
        Assert.Contains("If an account exists with a verified email address", response.Body);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsRateLimitWithoutLoggingEmail()
    {
        _service
            .Setup(service => service.RequestResetAsync("person@example.com"))
            .ThrowsAsync(new TooManyRequestsException("throttled"));
        var handler = new ForgotPasswordHandler(_service.Object);

        var response = await handler.HandleRequest(new APIGatewayProxyRequest
        {
            Body = JsonSerializer.Serialize(new { email = "person@example.com" })
        }, _context.Object);

        Assert.Equal(429, response.StatusCode);
        _logger.Verify(logger => logger.LogLine(It.Is<string>(message => message.Contains("person@example.com"))), Times.Never);
    }

    [Fact]
    public async Task ResetPassword_ReturnsGenericErrorForInvalidCode()
    {
        _service
            .Setup(service => service.ResetPasswordAsync("person@example.com", "123456", "StrongPass1!"))
            .ThrowsAsync(new CodeMismatchException("invalid code"));
        var handler = new ResetPasswordHandler(_service.Object);

        var response = await handler.HandleRequest(new APIGatewayProxyRequest
        {
            Body = JsonSerializer.Serialize(new
            {
                email = "person@example.com",
                confirmationCode = "123456",
                newPassword = "StrongPass1!"
            })
        }, _context.Object);

        Assert.Equal(400, response.StatusCode);
        Assert.Contains("invalid or expired", response.Body);
        Assert.DoesNotContain("123456", response.Body);
        _logger.Verify(logger => logger.LogLine(It.Is<string>(message => message.Contains("123456"))), Times.Never);
    }

    [Theory]
    [InlineData("short1!")]
    [InlineData("NoNumber!")]
    [InlineData("NoSymbol1")]
    public async Task ResetPassword_RejectsPasswordThatDoesNotMatchPoolPolicy(string password)
    {
        var handler = new ResetPasswordHandler(_service.Object);

        var response = await handler.HandleRequest(new APIGatewayProxyRequest
        {
            Body = JsonSerializer.Serialize(new
            {
                email = "person@example.com",
                confirmationCode = "123456",
                newPassword = password
            })
        }, _context.Object);

        Assert.Equal(400, response.StatusCode);
        _service.Verify(service => service.ResetPasswordAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}
