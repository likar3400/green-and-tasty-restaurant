using System.Text.Json.Serialization;

namespace APIHandler.Models.PasswordReset;

public sealed class ResetPasswordRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("confirmationCode")]
    public string ConfirmationCode { get; set; } = string.Empty;

    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}
