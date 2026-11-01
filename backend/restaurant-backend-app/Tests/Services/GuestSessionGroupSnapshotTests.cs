using APIHandler.Entities;
using APIHandler.Exceptions;
using APIHandler.Models.GuestSessions;
using APIHandler.Repositories.Auth;
using APIHandler.Repositories.Dishes;
using APIHandler.Repositories.GroupReservations;
using APIHandler.Repositories.GuestSessions;
using APIHandler.Repositories.Reservations;
using APIHandler.Repositories.Tables;
using APIHandler.Services.GuestSessions;
using Moq;

namespace APIHandler.Tests.Services;

public class GuestSessionGroupSnapshotTests
{
    private const string OwnerId = "owner-1";
    private const string GroupId = "group-1";
    private const string ReservationId = "reservation-1";

    private readonly Mock<IGuestSessionRepository> _sessions = new();
    private readonly Mock<IGroupReservationRepository> _groups = new();
    private readonly Mock<IDishRepository> _dishes = new();
    private readonly Mock<IReservationRepository> _reservations = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ITableRepository> _tables = new();
    private readonly GuestSessionService _service;

    public GuestSessionGroupSnapshotTests()
    {
        _service = new GuestSessionService(_groups.Object, _sessions.Object, _dishes.Object, _reservations.Object, _users.Object, _tables.Object);

        _groups.Setup(r => r.GetGroupReservationByIdAsync(GroupId)).ReturnsAsync(new GroupReservation
        {
            GroupReservationId = GroupId,
            ReservationId = ReservationId,
            ReservationToken = "token",
            Status = GroupReservationStatus.Open
        });
        _groups.Setup(r => r.GetByReservationIdAsync(ReservationId)).ReturnsAsync(new GroupReservation
        {
            GroupReservationId = GroupId,
            ReservationId = ReservationId,
            ReservationToken = "token",
            Status = GroupReservationStatus.Open
        });
        _reservations.Setup(r => r.GetReservationByIdAsync(ReservationId)).ReturnsAsync(new Reservation
        {
            Id = ReservationId,
            TableId = "table-1",
            WaiterId = "waiter-1",
            CustomerId = OwnerId
        });
    }

    private static GuestSession Session(string id, bool owner = false, string groupId = GroupId, params (string dishId, int quantity)[] dishes) => new()
    {
        Id = id,
        GuestName = id,
        GroupReservationId = groupId,
        IsOwnerSession = owner,
        Dishes = dishes.Select(d => new OrderItem { DishId = d.dishId, Quantity = d.quantity }).ToList()
    };

    [Fact]
    public async Task GetGroupSessionsAsync_ReturnsOwnerFirst_WithTotals()
    {
        _sessions.Setup(r => r.GetAllByGroupReservationIdAsync(GroupId)).ReturnsAsync(
        [
            Session("guest-1", false, GroupId, ("dish1", 2)),
            Session("owner-session", true, GroupId, ("dish2", 1))
        ]);
        _dishes.Setup(r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>())).ReturnsAsync(
        [
            new Dish { Id = "dish1", Name = "Caesar Salad", Price = 180, LocationId = "l1" },
            new Dish { Id = "dish2", Name = "Tom Yum", Price = 220, LocationId = "l1" }
        ]);

        var result = await _service.GetGroupSessionsAsync(OwnerId, GroupId);

        var participants = result.Participants.ToList();
        Assert.Equal(ParticipantType.Owner, participants[0].Type);
        Assert.Equal(ParticipantType.Guest, participants[1].Type);
        Assert.Equal(220, participants[0].Total);
        Assert.Equal(360, participants[1].Total);
        Assert.Equal(580, result.Total);
    }

    [Fact]
    public async Task GetGroupSessionsAsync_NoDishes_DoesNotQueryDishes_AndTotalIsZero()
    {
        _sessions.Setup(r => r.GetAllByGroupReservationIdAsync(GroupId)).ReturnsAsync([Session("guest-1")]);

        var result = await _service.GetGroupSessionsAsync(OwnerId, GroupId);

        Assert.Equal(0, result.Total);
        _dishes.Verify(r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>()), Times.Never);
    }

    [Fact]
    public async Task GetGroupSessionsAsync_CallerIsNotOwner_ThrowsActionForbiddenException()
    {
        await Assert.ThrowsAsync<ActionForbiddenException>(() => _service.GetGroupSessionsAsync("somebody-else", GroupId));
    }

    [Fact]
    public async Task GetGroupSessionsAsync_UnknownGroup_ThrowsGroupReservationNotFoundException()
    {
        _groups.Setup(r => r.GetGroupReservationByIdAsync("missing")).ReturnsAsync((GroupReservation?)null);

        await Assert.ThrowsAsync<GroupReservationNotFoundException>(() => _service.GetGroupSessionsAsync(OwnerId, "missing"));
    }

    [Fact]
    public async Task GetOwnerGuestSessionIdAsync_CreatesOwnerSessionOnce()
    {
        _sessions.Setup(r => r.GetAllByGroupReservationIdAsync(GroupId)).ReturnsAsync([]);
        GuestSession? saved = null;
        _sessions.Setup(r => r.SaveAsync(It.IsAny<GuestSession>())).Callback<GuestSession>(s => saved = s);

        string id = await _service.GetOwnerGuestSessionIdAsync(OwnerId, ReservationId);

        Assert.NotNull(saved);
        Assert.True(saved.IsOwnerSession);
        Assert.Equal(saved.Id, id);
    }

    [Fact]
    public async Task GetOwnerGuestSessionIdAsync_ReturnsExistingOwnerSession_WithoutSaving()
    {
        _sessions.Setup(r => r.GetAllByGroupReservationIdAsync(GroupId)).ReturnsAsync([Session("existing-owner", true)]);

        string id = await _service.GetOwnerGuestSessionIdAsync(OwnerId, ReservationId);

        Assert.Equal("existing-owner", id);
        _sessions.Verify(r => r.SaveAsync(It.IsAny<GuestSession>()), Times.Never);
    }

    [Fact]
    public async Task GetOwnerGuestSessionIdAsync_UnknownReservation_ThrowsReservationNotFoundException()
    {
        _reservations.Setup(r => r.GetReservationByIdAsync("missing")).ReturnsAsync((Reservation?)null);

        await Assert.ThrowsAsync<ReservationNotFoundException>(() => _service.GetOwnerGuestSessionIdAsync(OwnerId, "missing"));
    }

    [Fact]
    public async Task GetOwnerGuestSessionIdAsync_CallerIsNotOwner_ThrowsActionForbiddenException()
    {
        await Assert.ThrowsAsync<ActionForbiddenException>(() => _service.GetOwnerGuestSessionIdAsync("somebody-else", ReservationId));
    }

    [Fact]
    public async Task DeleteGuestSessionAsync_RemovesSession_AndReturnsUpdatedSnapshot()
    {
        var removed = Session("guest-1", false, GroupId, ("dish1", 2));
        var remaining = Session("guest-2", false, GroupId, ("dish2", 1));
        _sessions.Setup(r => r.GetByGuestSessionId("guest-1")).ReturnsAsync(removed);
        _sessions.Setup(r => r.GetAllByGroupReservationIdAsync(GroupId)).ReturnsAsync([remaining]);
        _dishes.Setup(r => r.GetDishesByIdsAsync(It.IsAny<IEnumerable<string>>())).ReturnsAsync(
        [
            new Dish { Id = "dish2", Name = "Tom Yum", Price = 220, LocationId = "l1" }
        ]);

        var result = await _service.DeleteGuestSessionAsync(OwnerId, GroupId, "guest-1");

        _sessions.Verify(r => r.DeleteAsync(removed), Times.Once);
        Assert.Single(result.Participants);
        Assert.Equal(220, result.Total);
    }

    [Fact]
    public async Task DeleteGuestSessionAsync_SessionFromAnotherGroup_ThrowsValidationException_AndDeletesNothing()
    {
        _sessions.Setup(r => r.GetByGuestSessionId("foreign")).ReturnsAsync(Session("foreign", false, "another-group"));

        await Assert.ThrowsAsync<ValidationException>(() => _service.DeleteGuestSessionAsync(OwnerId, GroupId, "foreign"));

        _sessions.Verify(r => r.DeleteAsync(It.IsAny<GuestSession>()), Times.Never);
    }

    [Fact]
    public async Task DeleteGuestSessionAsync_UnknownSession_ThrowsGuestSessionNotFoundException()
    {
        _sessions.Setup(r => r.GetByGuestSessionId("missing")).ReturnsAsync((GuestSession?)null);

        await Assert.ThrowsAsync<GuestSessionNotFoundException>(() => _service.DeleteGuestSessionAsync(OwnerId, GroupId, "missing"));
    }

    [Fact]
    public async Task DeleteGuestSessionAsync_OwnerSession_ThrowsValidationException()
    {
        _sessions.Setup(r => r.GetByGuestSessionId("owner-session")).ReturnsAsync(Session("owner-session", true));

        await Assert.ThrowsAsync<ValidationException>(() => _service.DeleteGuestSessionAsync(OwnerId, GroupId, "owner-session"));
    }

    [Fact]
    public async Task DeleteGuestSessionAsync_CallerIsNotOwner_ThrowsActionForbiddenException()
    {
        await Assert.ThrowsAsync<ActionForbiddenException>(() => _service.DeleteGuestSessionAsync("somebody-else", GroupId, "guest-1"));
    }
}
