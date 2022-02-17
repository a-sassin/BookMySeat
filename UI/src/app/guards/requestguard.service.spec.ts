import { TestBed } from '@angular/core/testing';

import { RequestguardService } from './requestguard.service';

describe('RequestguardService', () => {
    let service: RequestguardService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(RequestguardService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
