import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';
import { WebSocketService } from '../services/web-socket.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface LogoutRequestPayload {
    empId: string;
}

export interface LogoutResponse {
    message: string;
}

@Component({
    selector: 'app-logout',
    templateUrl: './logout.component.html',
    styleUrls: ['./logout.component.scss'],
})
export class LogoutComponent implements OnInit, OnDestroy {
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    constructor(
        private readonly authService: AuthService,
        private userService: UserService,
        private readonly router: Router,
        private readonly wsService: WebSocketService
    ) {}

    ngOnInit(): void {
        this.logout();
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    logout() {
        const { empId } = this.userService.getUserSessionData();

        const payload: LogoutRequestPayload = {
            empId,
        };

        this.authService
            .logout(payload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                () => {
                    this.clearUserSessionAndRedirectToLogin();
                },
                () => {
                    this.clearUserSessionAndRedirectToLogin();
                }
            );
    }

    private clearUserSessionAndRedirectToLogin(): void {
        this.wsService.disconnect();
        this.userService.resetUser();
        this.router.navigate(['/']);
    }
}
