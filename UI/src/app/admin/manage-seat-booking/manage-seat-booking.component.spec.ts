import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageSeatBookingComponent } from './manage-seat-booking.component';

describe('ManageSeatBookingComponent', () => {
    let component: ManageSeatBookingComponent;
    let fixture: ComponentFixture<ManageSeatBookingComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ManageSeatBookingComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ManageSeatBookingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
