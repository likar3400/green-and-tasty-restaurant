import { DEMO_DISHES, DEMO_LOCATIONS } from './catalog-demo-data';

describe('catalog demo fixtures', () => {
  it('uses the menu and location images shipped in the Green-and-Tasty ZIP', () => {
    expect(DEMO_DISHES.length).toBeGreaterThan(0);
    expect(DEMO_LOCATIONS.length).toBeGreaterThan(0);
    for (const dish of DEMO_DISHES) {
      expect(dish.id.startsWith('demo-catalog-')).toBeTrue();
      expect(dish.imageUrl).toMatch(/^assets\/img\/dishes\/.+\.jpg$/);
    }
    for (const location of DEMO_LOCATIONS) {
      expect(location.id.startsWith('demo-catalog-')).toBeTrue();
      expect(location.imageUrl).toMatch(/^assets\/img\/locations\/.+\.jpg$/);
    }
  });
});
