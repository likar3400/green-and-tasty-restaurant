using System.Text.Json.Serialization;

namespace APIHandler.Models.Registration;

public sealed class ResendRegistrationCodeRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}
