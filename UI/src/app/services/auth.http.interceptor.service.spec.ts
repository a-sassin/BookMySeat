import { TestBed } from '@angular/core/testing';

import { AuthHttpInterceptor } from './auth.http.interceptor.service';

describe('AuthHttpInterceptor', () => {
    let service: AuthHttpInterceptor;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(AuthHttpInterceptor);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
