using APIHandler.Models.GroupReservation;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace APIHandler.Services.GroupReservations;

public interface IGroupPreOrderService
{
    /// <summary>
    /// Consolidates the submitted guest carts of a group into the owner's order and
    /// marks both the order (SubmittedByCustomer) and the group reservation (Submitted).
    /// </summary>
    Task<IReadOnlyList<SubmittedDishResponse>> SubmitAsync(string userId, string groupReservationId, string reservationId);
}
