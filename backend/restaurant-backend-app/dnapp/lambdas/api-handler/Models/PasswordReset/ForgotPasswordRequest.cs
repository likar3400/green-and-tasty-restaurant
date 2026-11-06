using System.Text.Json.Serialization;

namespace APIHandler.Models.PasswordReset;

public sealed class ForgotPasswordRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}
