import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LocationCardComponent } from './location-card.component';
import { LocationResponse } from '@app/models/locations/location-response.model';

describe('LocationCardComponent', () => {
  let component: LocationCardComponent;
  let fixture: ComponentFixture<LocationCardComponent>;

  const location: LocationResponse = {
    id: 'location-1',
    address: '14 Baratashvili Street',
    description: 'Test restaurant',
    totalCapacity: 50,
    averageOccupancy: '75%',
    imageUrl: 'assets/img/locations/baratashvili-street-14.jpg',
    rating: 4.5,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationCardComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('location', location);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('can render a local demo card without a live location link', () => {
    fixture.componentRef.setInput('linkEnabled', false);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.hasAttribute('href')).toBeFalse();
  });
});
