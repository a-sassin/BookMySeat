import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockFacilityComponent } from './block-facility.component';

describe('BlockFacilityComponent', () => {
    let component: BlockFacilityComponent;
    let fixture: ComponentFixture<BlockFacilityComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BlockFacilityComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BlockFacilityComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
