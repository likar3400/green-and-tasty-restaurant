import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DishesService } from '@app/services/dishes/dishes.service';
import { FeedbacksService } from '@app/services/feedbacks/feedbacks.service';
import { LocationsService } from '@app/services/locations/locations.service';
import { ReservationService } from '@app/services/reservation/reservation.service';
import { UsersService } from '@app/services/users/users.service';
import { MainPageComponent } from './main-page.component';

describe('MainPageComponent catalog states', () => {
  let fixture: ComponentFixture<MainPageComponent>;
  let locationsService: jasmine.SpyObj<LocationsService>;

  beforeEach(async () => {
    locationsService = jasmine.createSpyObj<LocationsService>('LocationsService', ['getLocations']);
    const dishesService = jasmine.createSpyObj<DishesService>('DishesService', ['getPopularDishes']);
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

    await TestBed.configureTestingModule({
      imports: [MainPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: LocationsService, useValue: locationsService },
        { provide: DishesService, useValue: dishesService },
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

    fixture.componentInstance.loadLocations();
    fixture.detectChanges();

    expect(fixture.componentInstance.locationsLoading).toBeFalse();
    expect(fixture.componentInstance.locationsError).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Locations could not be loaded.');
  });
});