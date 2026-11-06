import { Injectable } from '@angular/core';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { LocationResponse } from '@app/models/locations/location-response.model';

interface CatalogDemoResult<T> {
  items: T[];
  usedDemoData: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogDemoService {
  resolveDishes(apiDishes: DishListResponse[], _category?: string): CatalogDemoResult<DishListResponse> {
    return { items: apiDishes, usedDemoData: false };
  }

  resolveLocations(apiLocations: LocationResponse[]): CatalogDemoResult<LocationResponse> {
    return { items: apiLocations, usedDemoData: false };
  }
}
