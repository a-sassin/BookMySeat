import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitBookingComponent } from './visit-booking.component';

describe('VisitBookingComponent', () => {
    let component: VisitBookingComponent;
    let fixture: ComponentFixture<VisitBookingComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [VisitBookingComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(VisitBookingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
