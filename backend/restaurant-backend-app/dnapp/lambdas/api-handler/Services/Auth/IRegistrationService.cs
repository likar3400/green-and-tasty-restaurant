using System.Threading.Tasks;

namespace APIHandler.Services.Auth;

public interface IRegistrationService
{
    Task<string?> RegisterAsync(string firstName, string lastName, string email, string password);
    Task ConfirmEmailAsync(string email, string confirmationCode);
    Task ResendConfirmationCodeAsync(string email);
}
