using System.Threading.Tasks;

namespace APIHandler.Services.Auth;

public interface IPasswordResetService
{
    Task RequestResetAsync(string email);
    Task ResetPasswordAsync(string email, string confirmationCode, string newPassword);
}
