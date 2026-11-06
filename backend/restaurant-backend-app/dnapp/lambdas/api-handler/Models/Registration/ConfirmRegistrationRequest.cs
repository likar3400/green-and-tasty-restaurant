using System.Text.Json.Serialization;

namespace APIHandler.Models.Registration;

public sealed class ConfirmRegistrationRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("confirmationCode")]
    public string ConfirmationCode { get; set; } = string.Empty;
}
