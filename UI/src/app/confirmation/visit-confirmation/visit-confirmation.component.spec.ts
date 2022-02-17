import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitConfirmationComponent } from './visit-confirmation.component';

describe('VisitConfirmationComponent', () => {
    let component: VisitConfirmationComponent;
    let fixture: ComponentFixture<VisitConfirmationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [VisitConfirmationComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(VisitConfirmationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
