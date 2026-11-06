import { TestBed } from '@angular/core/testing';
import { CatalogDemoService } from './catalog-demo.production.service';

describe('ProductionCatalogDemoService', () => {
  it('passes empty API responses through without substituting demo records', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(CatalogDemoService);

    expect(service.resolveDishes([])).toEqual({ items: [], usedDemoData: false });
    expect(service.resolveLocations([])).toEqual({ items: [], usedDemoData: false });
  });
});
