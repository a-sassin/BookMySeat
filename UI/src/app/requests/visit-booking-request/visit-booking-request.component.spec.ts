import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitBookingRequestComponent } from './visit-booking-request.component';

describe('VisitBookingRequestComponent', () => {
    let component: VisitBookingRequestComponent;
    let fixture: ComponentFixture<VisitBookingRequestComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [VisitBookingRequestComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(VisitBookingRequestComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
