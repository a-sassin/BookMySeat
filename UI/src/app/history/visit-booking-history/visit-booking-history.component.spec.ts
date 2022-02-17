import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitBookingHistoryComponent } from './visit-booking-history.component';

describe('VisitBookingHistoryComponent', () => {
    let component: VisitBookingHistoryComponent;
    let fixture: ComponentFixture<VisitBookingHistoryComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [VisitBookingHistoryComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(VisitBookingHistoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
