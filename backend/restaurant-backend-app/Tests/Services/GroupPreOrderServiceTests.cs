using APIHandler.Constants.Orders;
using APIHandler.Entities;
using APIHandler.Exceptions;
using APIHandler.Repositories.GroupReservations;
using APIHandler.Repositories.GuestSessions;
using APIHandler.Repositories.Orders;
using APIHandler.Repositories.Reservations;
using APIHandler.Services.GroupReservations;
using Moq;

namespace APIHandler.Tests.Services;

public class GroupPreOrderServiceTests
{
    private const string OwnerId = "owner-1";
    private const string GroupId = "group-1";
    private const string ReservationId = "reservation-1";

    private readonly Mock<IGroupReservationRepository> _groups = new();
    private readonly Mock<IReservationRepository> _reservations = new();
    private readonly Mock<IGuestSessionRepository> _sessions = new();
    private readonly Mock<IOrderRepository> _orders = new();
    private readonly GroupPreOrderService _service;

    private readonly GroupReservation _group = new()
    {
        GroupReservationId = GroupId,
        ReservationId = ReservationId,
        ReservationToken = "token",
        Status = GroupReservationStatus.Open
    };

    private readonly Reservation _reservation = new()
    {
        Id = ReservationId,
        TableId = "table-1",
        WaiterId = "waiter-1",
        CustomerId = OwnerId
    };

    public GroupPreOrderServiceTests()
    {
        _service = new GroupPreOrderService(_groups.Object, _reservations.Object, _sessions.Object, _orders.Object);

        _groups.Setup(r => r.GetGroupReservationByIdAsync(GroupId)).ReturnsAsync(_group);
        _reservations.Setup(r => r.GetReservationByIdAsync(ReservationId)).ReturnsAsync(_reservation);
    }

    private static GuestSession Session(string id, bool submitted, params (string dishId, int quantity)[] dishes) => new()
    {
        Id = id,
        GuestName = id,
        GroupReservationId = GroupId,
        IsSubmitted = submitted,
        Dishes = dishes.Select(d => new OrderItem { DishId = d.dishId, Quantity = d.quantity }).ToList()
    };

    private Order SetupOrder()
    {
        var order = new Order
        {
            OrderId = "order-1",
            CustomerId = OwnerId,
            ReservationId = ReservationId,
            ReservationAddress = "address",
            ReservationTime = "time",
            Dishes = [],
            Status = OrderStatus.Created
        };
        _orders.Setup(r => r.GetOrderByReservationIdAsync(ReservationId)).ReturnsAsync(order);
        return order;
    }

    private void SetupSessions(params GuestSession[] sessions) =>
        _sessions.Setup(r => r.GetAllByGroupReservationIdAsync(GroupId)).ReturnsAsync([.. sessions]);

    [Fact]
    public async Task SubmitAsync_MergesOnlySubmittedSessionsByDishId_AndUpdatesStatuses()
    {
        var order = SetupOrder();
        SetupSessions(
            Session("s1", true, ("dish1", 2), ("dish2", 1)),
            Session("s2", true, ("dish1", 1), ("dish2", 1)),
            Session("s3", false, ("dish1", 10), ("dish3", 5)));

        var result = await _service.SubmitAsync(OwnerId, GroupId, ReservationId);

        Assert.Equal(2, result.Count);
        Assert.Equal(("dish1", 3), (result[0].DishId, result[0].Quantity));
        Assert.Equal(("dish2", 2), (result[1].DishId, result[1].Quantity));

        Assert.Equal(OrderStatus.SubmittedByCustomer, order.Status);
        Assert.Equal(3, order.Dishes.Single(d => d.DishId == "dish1").Quantity);
        Assert.DoesNotContain(order.Dishes, d => d.DishId == "dish3");
        Assert.Equal(GroupReservationStatus.Submitted, _group.Status);

        _orders.Verify(r => r.SaveOrderAsync(order), Times.Once);
        _groups.Verify(r => r.SaveGroupReservationAsync(_group), Times.Once);
    }

    [Fact]
    public async Task SubmitAsync_AddsQuantityToDishesAlreadyInOrder()
    {
        var order = SetupOrder();
        order.Dishes.Add(new OrderItem { DishId = "dish1", Quantity = 1 });
        SetupSessions(Session("s1", true, ("dish1", 2)));

        await _service.SubmitAsync(OwnerId, GroupId, ReservationId);

        Assert.Equal(3, order.Dishes.Single(d => d.DishId == "dish1").Quantity);
    }

    [Fact]
    public async Task SubmitAsync_NoSubmittedSessions_ThrowsValidationException_AndChangesNothing()
    {
        SetupOrder();
        SetupSessions(Session("s1", false, ("dish1", 1)));

        await Assert.ThrowsAsync<ValidationException>(() => _service.SubmitAsync(OwnerId, GroupId, ReservationId));

        _orders.Verify(r => r.SaveOrderAsync(It.IsAny<Order>()), Times.Never);
        Assert.Equal(GroupReservationStatus.Open, _group.Status);
    }

    [Fact]
    public async Task SubmitAsync_SubmittedSessionsWithoutDishes_ThrowsValidationException()
    {
        SetupOrder();
        SetupSessions(Session("s1", true));

        await Assert.ThrowsAsync<ValidationException>(() => _service.SubmitAsync(OwnerId, GroupId, ReservationId));
    }

    [Fact]
    public async Task SubmitAsync_OrderNotFound_ThrowsValidationException()
    {
        SetupSessions(Session("s1", true, ("dish1", 1)));
        _orders.Setup(r => r.GetOrderByReservationIdAsync(ReservationId)).ReturnsAsync((Order?)null);

        await Assert.ThrowsAsync<ValidationException>(() => _service.SubmitAsync(OwnerId, GroupId, ReservationId));
    }

    [Fact]
    public async Task SubmitAsync_GroupNotFound_ThrowsGroupReservationNotFoundException()
    {
        _groups.Setup(r => r.GetGroupReservationByIdAsync(GroupId)).ReturnsAsync((GroupReservation?)null);

        await Assert.ThrowsAsync<GroupReservationNotFoundException>(() => _service.SubmitAsync(OwnerId, GroupId, ReservationId));
    }

    [Fact]
    public async Task SubmitAsync_ReservationNotFound_ThrowsReservationNotFoundException()
    {
        _reservations.Setup(r => r.GetReservationByIdAsync(ReservationId)).ReturnsAsync((Reservation?)null);

        await Assert.ThrowsAsync<ReservationNotFoundException>(() => _service.SubmitAsync(OwnerId, GroupId, ReservationId));
    }

    [Fact]
    public async Task SubmitAsync_CallerIsNotOwner_ThrowsActionForbiddenException()
    {
        await Assert.ThrowsAsync<ActionForbiddenException>(() => _service.SubmitAsync("somebody-else", GroupId, ReservationId));
    }

    [Fact]
    public async Task SubmitAsync_ReservationFromAnotherGroup_ThrowsValidationException()
    {
        _group.ReservationId = "another-reservation";

        await Assert.ThrowsAsync<ValidationException>(() => _service.SubmitAsync(OwnerId, GroupId, ReservationId));
    }

    [Fact]
    public async Task SubmitAsync_GroupAlreadySubmitted_ThrowsGroupReservationSubmittedException()
    {
        _group.Status = GroupReservationStatus.Submitted;

        await Assert.ThrowsAsync<GroupReservationSubmittedException>(() => _service.SubmitAsync(OwnerId, GroupId, ReservationId));
    }
}
