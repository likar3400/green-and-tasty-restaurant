import { TestBed } from '@angular/core/testing';
import { DishType } from '@app/models/enums/dish-type.model';
import { CATALOG_DEMO_DATA_ENABLED, canEnableCatalogDemoData, CatalogDemoService } from './catalog-demo.service';
import { environment as developmentEnvironment } from '../../../environments/environment.development';
import { environment as defaultEnvironment } from '../../../environments/environment';

describe('CatalogDemoService', () => {
  it('enables demo fixtures only in the development environment', () => {
    expect(developmentEnvironment.enableCatalogDemoData).toBeTrue();
    expect(defaultEnvironment.enableCatalogDemoData).toBeFalse();
  });

  it('only enables fixtures when both build config and runtime are development', () => {
    expect(canEnableCatalogDemoData(true, true)).toBeTrue();
    expect(canEnableCatalogDemoData(false, true)).toBeFalse();
    expect(canEnableCatalogDemoData(true, false)).toBeFalse();
    expect(canEnableCatalogDemoData(false, false)).toBeFalse();
  });

  it('uses local fixture locations and dishes only for empty API lists when enabled', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: CATALOG_DEMO_DATA_ENABLED, useValue: true }],
    });
    const service = TestBed.inject(CatalogDemoService);

    const locations = service.resolveLocations([]);
    const dishes = service.resolveDishes([]);
    expect(locations.usedDemoData).toBeTrue();
    expect(locations.items.length).toBe(3);
    expect(dishes.usedDemoData).toBeTrue();
    expect(dishes.items.length).toBe(4);
    expect(service.resolveDishes([], DishType.Appetizer).items.length).toBe(1);
    expect(service.resolveDishes([], DishType.Dessert)).toEqual({ items: [], usedDemoData: false });
  });

  it('never replaces empty production lists or non-empty API responses', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: CATALOG_DEMO_DATA_ENABLED, useValue: false }],
    });
    const service = TestBed.inject(CatalogDemoService);

    expect(service.resolveLocations([])).toEqual({ items: [], usedDemoData: false });
    expect(service.resolveDishes([])).toEqual({ items: [], usedDemoData: false });

    const apiDish = {
      id: 'api-dish',
      name: 'API dish',
      imageUrl: 'dish.jpg',
      price: 2,
      state: 'Available',
      weight: '100 g',
      dishType: 'MainCourse',
      description: '',
      calories: '0',
      proteins: '0',
      carbohydrates: '0',
      fats: '0',
      vitamins: '',
    };
    expect(service.resolveDishes([apiDish])).toEqual({ items: [apiDish], usedDemoData: false });
  });
});
