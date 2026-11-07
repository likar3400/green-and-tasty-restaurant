import { GuestMenuDish } from '@app/services/guest-sessions/guest-sessions.service';
import { DEMO_DISHES } from '@app/shared/mocks/catalog/catalog-demo-data';
import { DEMO_GROUP_ID, MockHttpError } from './group-orders.mock-store';

interface DemoGuestSession {
  token: string;
  cart: Map<string, number>;
  submitted: boolean;
}

export class GuestSessionMockStore {
  private readonly sessions = new Map<string, DemoGuestSession>();
  private nextSessionNumber = 1;

  createSession(groupReservationId: string, guestName: string) {
    if (!guestName.trim()) {
      throw new MockHttpError(400, 'Guest name is required.');
    }

    if (groupReservationId !== DEMO_GROUP_ID) {
      throw new MockHttpError(404, 'Group reservation was not found.');
    }

    const number = this.nextSessionNumber++;
    const sessionId = `gs-demo-guest-${number}`;
    const sessionToken = `demo-guest-token-${number}`;
    this.sessions.set(sessionId, {
      token: sessionToken,
      cart: new Map(),
      submitted: false,
    });

    return { SessionId: sessionId, SessionToken: sessionToken };
  }

  getMenu(sessionId: string, token: string) {
    this.getSession(sessionId, token);
    const dishes: Record<string, GuestMenuDish[]> = {};

    for (const dish of DEMO_DISHES) {
      (dishes[dish.dishType] ??= []).push({
        id: dish.id,
        name: dish.name,
        description: dish.description,
        price: dish.price,
        weight: dish.weight,
        calories: dish.calories,
        proteins: dish.proteins,
        fats: dish.fats,
        carbohydrates: dish.carbohydrates,
        vitamins: dish.vitamins,
        imageUrl: dish.imageUrl,
        state: dish.state,
        selectable: dish.state === 'Available',
      });
    }

    return { dishes };
  }

  addDish(sessionId: string, token: string, dishId: string, quantity: number): void {
    const session = this.getSession(sessionId, token);
    if (session.submitted) throw new MockHttpError(409, 'Guest session was submitted.');
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new MockHttpError(400, 'Quantity must be greater than zero.');
    }
    if (!DEMO_DISHES.some((dish) => dish.id === dishId && dish.state === 'Available')) {
      throw new MockHttpError(400, 'Dish does not exist or is not available.');
    }

    session.cart.set(dishId, (session.cart.get(dishId) ?? 0) + quantity);
  }

  removeDish(sessionId: string, token: string, dishId: string, quantity: number): void {
    const session = this.getSession(sessionId, token);
    if (session.submitted) throw new MockHttpError(409, 'Guest session was submitted.');
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new MockHttpError(400, 'Quantity must be greater than zero.');
    }

    const currentQuantity = session.cart.get(dishId);
    if (currentQuantity === undefined) throw new MockHttpError(404, 'Dish was not found in guest session.');

    if (currentQuantity <= quantity) session.cart.delete(dishId);
    else session.cart.set(dishId, currentQuantity - quantity);
  }

  submit(sessionId: string, token: string): void {
    const session = this.getSession(sessionId, token);
    if (session.submitted) throw new MockHttpError(409, 'Guest session was submitted.');
    if (session.cart.size === 0) throw new MockHttpError(400, 'No dishes selected.');

    session.submitted = true;
  }

  private getSession(sessionId: string, token: string): DemoGuestSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.token !== token) {
      throw new MockHttpError(401, 'Guest session is invalid.');
    }
    return session;
  }
}
