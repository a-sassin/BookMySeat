import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockHistoryComponent } from './block-history.component';

describe('BlockHistoryComponent', () => {
    let component: BlockHistoryComponent;
    let fixture: ComponentFixture<BlockHistoryComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BlockHistoryComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BlockHistoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
