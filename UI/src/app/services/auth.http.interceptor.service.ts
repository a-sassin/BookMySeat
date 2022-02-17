import { Injectable } from '@angular/core';
import {
    HttpInterceptor,
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpErrorResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserService } from './user.service';

@Injectable({
    providedIn: 'root',
})
export class AuthHttpInterceptor implements HttpInterceptor {
    constructor(
        private readonly router: Router,
        private readonly userService: UserService
    ) {}

    intercept(
        req: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        const token = this.userService.getUserSessionData()?.token;
        const authToken = 'Bearer ' + token;
        const authRequest = req.clone({
            headers: req.headers.set('Authorization', authToken),
        });

        return next.handle(authRequest).pipe(
            tap(
                () => {},
                (error: any) => {
                    if (error instanceof HttpErrorResponse) {
                        if (error.status === 401) {
                            this.router.navigate(['/login']);
                        }
                    }
                }
            )
        );
    }
}
