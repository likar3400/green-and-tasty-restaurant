import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DishesService } from '@app/services/dishes/dishes.service';
import { FeedbacksService } from '@app/services/feedbacks/feedbacks.service';
import { LocationsService } from '@app/services/locations/locations.service';
import { ReservationService } from '@app/services/reservation/reservation.service';
import { UsersService } from '@app/services/users/users.service';
import { CatalogDemoService } from '@app/services/catalog-demo/catalog-demo.service';
import { DEMO_DISHES, DEMO_LOCATIONS } from '@app/shared/mocks/catalog/catalog-demo-data';
import { MainPageComponent } from './main-page.component';

describe('MainPageComponent catalog states', () => {
  let fixture: ComponentFixture<MainPageComponent>;
  let locationsService: jasmine.SpyObj<LocationsService>;
  let dishesService: jasmine.SpyObj<DishesService>;
  let catalogDemoService: jasmine.SpyObj<CatalogDemoService>;

  beforeEach(async () => {
    locationsService = jasmine.createSpyObj<LocationsService>('LocationsService', ['getLocations']);
    dishesService = jasmine.createSpyObj<DishesService>('DishesService', ['getPopularDishes']);
    catalogDemoService = jasmine.createSpyObj<CatalogDemoService>(
      'CatalogDemoService',
      ['resolveDishes', 'resolveLocations']
    );
    const reservationsService = jasmine.createSpyObj<ReservationService>(
      'ReservationService',
      ['getReservationById']
    );
    const usersService = jasmine.createSpyObj<UsersService>('UsersService', ['getUserProfileImage']);
    const feedbacksService = jasmine.createSpyObj<FeedbacksService>(
      'FeedbacksService',
      ['getFeedbackByReservation']
    );
    locationsService.getLocations.and.returnValue(of([]));
    dishesService.getPopularDishes.and.returnValue(of([]));
    catalogDemoService.resolveDishes.and.callFake((items) => ({ items, usedDemoData: false }));
    catalogDemoService.resolveLocations.and.callFake((items) => ({ items, usedDemoData: false }));

    await TestBed.configureTestingModule({
      imports: [MainPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: LocationsService, useValue: locationsService },
        { provide: DishesService, useValue: dishesService },
        { provide: CatalogDemoService, useValue: catalogDemoService },
        { provide: ReservationService, useValue: reservationsService },
        { provide: UsersService, useValue: usersService },
        { provide: FeedbacksService, useValue: feedbacksService },
      ],
    })
      .overrideComponent(MainPageComponent, { set: { providers: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(MainPageComponent);
    fixture.detectChanges();
  });

  it('shows an empty state when the locations API returns no records', () => {
    expect(fixture.componentInstance.locationsLoading).toBeFalse();
    expect(fixture.componentInstance.locationsError).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('No locations are available yet.');
  });

  it('shows an error state when locations cannot be loaded', () => {
    locationsService.getLocations.and.returnValue(throwError(() => new Error('offline')));
    catalogDemoService.resolveLocations.and.returnValue({ items: DEMO_LOCATIONS, usedDemoData: true });
    catalogDemoService.resolveLocations.calls.reset();

    fixture.componentInstance.loadLocations();
    fixture.detectChanges();

    expect(fixture.componentInstance.locationsLoading).toBeFalse();
    expect(fixture.componentInstance.locationsError).toBeTrue();
    expect(catalogDemoService.resolveLocations).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Locations could not be loaded.');
  });

  it('renders labeled cafe and dish cards from enabled local fixtures when APIs are empty', () => {
    catalogDemoService.resolveDishes.and.returnValue({ items: DEMO_DISHES, usedDemoData: true });
    catalogDemoService.resolveLocations.and.returnValue({ items: DEMO_LOCATIONS, usedDemoData: true });

    fixture.componentInstance.loadPopularDishes();
    fixture.componentInstance.loadLocations();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.popular-dishes-section .dish-card').length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('app-location-card').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Spring Salad');
    expect(fixture.nativeElement.textContent).toContain('Rustaveli Avenue 48');
    expect(fixture.nativeElement.textContent).toContain('Local demo catalog');
    expect(fixture.nativeElement.textContent).toContain('Local demo locations');
    expect(fixture.nativeElement.querySelector('app-location-card a[aria-disabled="true"]')).not.toBeNull();
  });
});