import { isDevMode, inject, Injectable, InjectionToken } from '@angular/core';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { LocationResponse } from '@app/models/locations/location-response.model';
import { environment } from '../../../environments/environment';
import { DEMO_DISHES, DEMO_LOCATIONS } from '@app/shared/mocks/catalog/catalog-demo-data';

export function canEnableCatalogDemoData(configured: boolean, runtimeDevMode: boolean): boolean {
  return configured && runtimeDevMode;
}

export const CATALOG_DEMO_DATA_ENABLED = new InjectionToken<boolean>('CATALOG_DEMO_DATA_ENABLED', {
  providedIn: 'root',
  factory: () => canEnableCatalogDemoData(environment.enableCatalogDemoData, isDevMode()),
});

export interface CatalogDemoResult<T> {
  items: T[];
  usedDemoData: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogDemoService {
  private readonly enabled = inject(CATALOG_DEMO_DATA_ENABLED);

  resolveDishes(apiDishes: DishListResponse[], category?: string): CatalogDemoResult<DishListResponse> {
    if (apiDishes.length > 0 || !this.enabled) {
      return { items: apiDishes, usedDemoData: false };
    }
    const items = category
      ? DEMO_DISHES.filter((dish) => dish.dishType === category)
      : DEMO_DISHES;
    return { items: [...items], usedDemoData: items.length > 0 };
  }

  resolveLocations(apiLocations: LocationResponse[]): CatalogDemoResult<LocationResponse> {
    if (apiLocations.length > 0 || !this.enabled) {
      return { items: apiLocations, usedDemoData: false };
    }
    return { items: [...DEMO_LOCATIONS], usedDemoData: true };
  }
}
