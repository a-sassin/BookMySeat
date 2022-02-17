import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import {
    LoginRequestPayload,
    LoginResponse,
} from '../models/login-component.model';
import {
    LogoutRequestPayload,
    LogoutResponse,
} from '../logout/logout.component';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    constructor(private http: HttpClient) {}
    baseUrl = environment.baseUrl;

    login(employee: LoginRequestPayload): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${this.baseUrl}employee/login`,
            employee
        );
    }

    logout(payload: LogoutRequestPayload): Observable<LogoutResponse> {
        return this.http.post<LogoutResponse>(
            `${this.baseUrl}employee/logout`,
            payload
        );
    }
}
