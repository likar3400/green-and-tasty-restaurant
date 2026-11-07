import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuPageComponent } from './menu-page.component';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { DishesService } from '@app/services/dishes/dishes.service';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { CATALOG_DEMO_DATA_ENABLED } from '@app/services/catalog-demo/catalog-demo.service';
import { DEMO_DISHES } from '@app/shared/mocks/catalog/catalog-demo-data';
import { DishType } from '@app/models/enums/dish-type.model';

describe('MenuPageComponent', () => {
  let component: MenuPageComponent;
  let fixture: ComponentFixture<MenuPageComponent>;
  let dishesService: jasmine.SpyObj<DishesService>;
  let preOrdersService: jasmine.SpyObj<PreOrdersService>;
  let toastService: jasmine.SpyObj<ToastService>;

  async function createMenu(
    demoEnabled: boolean,
    apiResponse: Observable<DishListResponse[]> = of([]),
  ): Promise<void> {
    dishesService = jasmine.createSpyObj<DishesService>('DishesService', ['getDishes']);
    dishesService.getDishes.and.returnValue(apiResponse);
    preOrdersService = jasmine.createSpyObj<PreOrdersService>(
      'PreOrdersService',
      ['addDishToPreOrderByReservationId']
    );
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: DishesService, useValue: dishesService },
        { provide: PreOrdersService, useValue: preOrdersService },
        { provide: ToastService, useValue: toastService },
        { provide: CATALOG_DEMO_DATA_ENABLED, useValue: demoEnabled },
      ],
      imports: [MenuPageComponent],
    })
      .overrideComponent(MenuPageComponent, { set: { providers: [] } })
      .compileComponents();

    fixture = TestBed.createComponent(MenuPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    await createMenu(false);
    expect(component).toBeTruthy();
  });

  it('renders fixture menu cards with a clear sample-preview notice when enabled', async () => {
    await createMenu(true);

    expect(fixture.nativeElement.querySelectorAll('app-dish-card').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Spring Salad');
    expect(fixture.nativeElement.textContent).toContain('Sample menu preview');

    component.isPreOrderEnabled = true;
    component.preOrderReservationId = 'demo-reservation';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-custom-button')).toBeNull();

    component.addDishToCart(DEMO_DISHES[0]);
    expect(preOrdersService.addDishToPreOrderByReservationId).not.toHaveBeenCalled();
  });

  it('does not substitute fixture menu cards when demo data is disabled', async () => {
    await createMenu(false);

    expect(fixture.nativeElement.querySelectorAll('app-dish-card').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Sample menu preview');
    expect(fixture.nativeElement.textContent).toContain('No dishes are available yet.');
  });

  it('does not substitute fixtures for failed requests and reports the error', async () => {
    await createMenu(true, throwError(() => new Error('offline')));

    expect(fixture.nativeElement.querySelectorAll('app-dish-card').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Sample menu preview');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Menu dishes could not be loaded.');
    expect(toastService.error).toHaveBeenCalledOnceWith(
      'Unable to load menu dishes. Please try again later.',
      'Error',
    );
  });

  it('explains when no dessert records are available', async () => {
    await createMenu(false);
    component.selectedCategory = DishType.Dessert;
    dishesService.getDishes.and.returnValue(of([]));

    component.loadDishes();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No desserts are available yet.');
  });
});
