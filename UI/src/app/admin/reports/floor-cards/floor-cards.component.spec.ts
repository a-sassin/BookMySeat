import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloorCardsComponent } from './floor-cards.component';

describe('FloorCardsComponent', () => {
    let component: FloorCardsComponent;
    let fixture: ComponentFixture<FloorCardsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [FloorCardsComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(FloorCardsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
