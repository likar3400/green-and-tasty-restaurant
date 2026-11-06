using Amazon.CognitoIdentityProvider.Model;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using APIHandler.Handlers;
using APIHandler.Services.Auth;
using Moq;
using System.Text.Json;
using System.Threading.Tasks;

namespace APIHandler.Tests.Handlers;

public class RegistrationHandlerTests
{
    private readonly Mock<IRegistrationService> _service = new();
    private readonly Mock<ILambdaContext> _context = new();
    private readonly Mock<ILambdaLogger> _logger = new();

    public RegistrationHandlerTests()
    {
        _context.Setup(context => context.Logger).Returns(_logger.Object);
    }

    [Fact]
    public async Task RegisterReturnsVerificationRequiredAndDoesNotExposeCode()
    {
        _service
            .Setup(service => service.RegisterAsync("John", "Doe", "person@example.com", "StrongPass1!"))
            .ReturnsAsync("p***@example.com");

        var response = await new RegistrationHandler(_service.Object).HandleRequest(
            new APIGatewayProxyRequest
            {
                Body = JsonSerializer.Serialize(new
                {
                    firstName = "John",
                    lastName = "Doe",
                    email = "person@example.com",
                    password = "StrongPass1!",
                    confirmPassword = "StrongPass1!"
                })
            },
            _context.Object);

        Assert.Equal(200, response.StatusCode);
        Assert.Contains("requiresEmailConfirmation", response.Body);
        Assert.Contains("p***@example.com", response.Body);
        Assert.DoesNotContain("StrongPass1!", response.Body);
    }

    [Fact]
    public async Task ConfirmRegistrationDoesNotLogOrReturnConfirmationCode()
    {
        _service
            .Setup(service => service.ConfirmEmailAsync("person@example.com", "123456"))
            .ThrowsAsync(new CodeMismatchException("invalid code"));

        var response = await new ConfirmRegistrationHandler(_service.Object).HandleRequest(
            new APIGatewayProxyRequest
            {
                Body = JsonSerializer.Serialize(new { email = "person@example.com", confirmationCode = "123456" })
            },
            _context.Object);

        Assert.Equal(400, response.StatusCode);
        Assert.DoesNotContain("123456", response.Body);
        _logger.Verify(logger => logger.LogLine(It.Is<string>(message => message.Contains("123456"))), Times.Never);
    }

    [Fact]
    public async Task ResendConfirmationReturnsGenericSuccessForUnknownEmail()
    {
        _service
            .Setup(service => service.ResendConfirmationCodeAsync("unknown@example.com"))
            .Returns(Task.CompletedTask);

        var response = await new ResendRegistrationCodeHandler(_service.Object).HandleRequest(
            new APIGatewayProxyRequest
            {
                Body = JsonSerializer.Serialize(new { email = "unknown@example.com" })
            },
            _context.Object);

        Assert.Equal(200, response.StatusCode);
        Assert.Contains("If the account is awaiting email confirmation", response.Body);
    }
}
