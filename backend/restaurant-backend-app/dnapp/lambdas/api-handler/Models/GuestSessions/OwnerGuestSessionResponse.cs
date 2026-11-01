using System.Text.Json.Serialization;

namespace APIHandler.Models.GuestSessions;

public record OwnerGuestSessionResponse([property: JsonPropertyName("guestSessionId")] string GuestSessionId);
