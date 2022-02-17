import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnblockFacilityComponent } from './unblock-facility.component';

describe('UnblockFacilityComponent', () => {
    let component: UnblockFacilityComponent;
    let fixture: ComponentFixture<UnblockFacilityComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [UnblockFacilityComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(UnblockFacilityComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
