using APIHandler.Constants.Orders;
using APIHandler.Entities;
using APIHandler.Exceptions;
using APIHandler.Models.GroupReservation;
using APIHandler.Repositories.GroupReservations;
using APIHandler.Repositories.GuestSessions;
using APIHandler.Repositories.Orders;
using APIHandler.Repositories.Reservations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APIHandler.Services.GroupReservations;

public class GroupPreOrderService(
    IGroupReservationRepository groupReservationRepository,
    IReservationRepository reservationRepository,
    IGuestSessionRepository guestSessionRepository,
    IOrderRepository orderRepository) : IGroupPreOrderService
{
    public async Task<IReadOnlyList<SubmittedDishResponse>> SubmitAsync(string userId, string groupReservationId, string reservationId)
    {
        GroupReservation group = await groupReservationRepository.GetGroupReservationByIdAsync(groupReservationId)
            ?? throw new GroupReservationNotFoundException();

        Reservation reservation = await reservationRepository.GetReservationByIdAsync(reservationId)
            ?? throw new ReservationNotFoundException($"Reservation {reservationId} was not found.");

        if (!string.Equals(reservation.CustomerId, userId, StringComparison.OrdinalIgnoreCase))
            throw new ActionForbiddenException("Only the reservation owner can submit the group pre-order.");

        if (group.ReservationId != reservation.Id)
            throw new ValidationException("Reservation does not belong to this group reservation.");

        if (group.Status == GroupReservationStatus.Submitted)
            throw new GroupReservationSubmittedException();

        if (group.Status == GroupReservationStatus.Closed)
            throw new GroupReservationExpiredException();

        List<GuestSession> sessions = await guestSessionRepository.GetAllByGroupReservationIdAsync(groupReservationId);
        List<GuestSession> submittedSessions = sessions.Where(s => s.IsSubmitted).ToList();

        if (submittedSessions.Count == 0)
            throw new ValidationException("No submitted guest sessions found to consolidate.");

        // one line per dish, quantities of all submitted carts summed up
        List<SubmittedDishResponse> consolidated = submittedSessions
            .SelectMany(s => s.Dishes ?? [])
            .GroupBy(d => d.DishId)
            .Select(g => new SubmittedDishResponse(g.Key, g.Sum(d => d.Quantity)))
            .Where(d => d.Quantity > 0)
            .ToList();

        if (consolidated.Count == 0)
            throw new ValidationException("No dishes selected in the submitted guest sessions.");

        Order order = await orderRepository.GetOrderByReservationIdAsync(reservationId)
            ?? throw new ValidationException($"Active order for reservation '{reservationId}' not found.");

        order.Dishes ??= [];
        foreach (SubmittedDishResponse dish in consolidated)
        {
            OrderItem? existing = order.Dishes.FirstOrDefault(d => d.DishId == dish.DishId);
            if (existing is not null)
            {
                existing.Quantity += dish.Quantity;
            }
            else
            {
                order.Dishes.Add(new OrderItem
                {
                    DishId = dish.DishId,
                    Quantity = dish.Quantity,
                    State = OrderItemState.Pending
                });
            }
        }

        order.Status = OrderStatus.SubmittedByCustomer;
        await orderRepository.SaveOrderAsync(order);

        group.Status = GroupReservationStatus.Submitted;
        await groupReservationRepository.SaveGroupReservationAsync(group);

        return consolidated;
    }
}
