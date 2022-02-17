import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import {
    LoginRequestPayload,
    LoginResponse,
    UserSessionData,
} from '../models/login-component.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApprovalLevel } from '../models/role';
import { HttpErrorResponse } from '@angular/common/http';
import { EXTRA_FACILITY_PRACTICES } from '../util/constants';
import { EncryptDecryptService } from '../services/encrypt-decrypt.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
    loginForm: FormGroup;
    hide: boolean;
    invalidCreds = false;
    authenticationLoader = false;
    errorMessage: string;

    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    constructor(
        private readonly authService: AuthService,
        private readonly router: Router,
        private readonly encryptDecryptService: EncryptDecryptService,
        private readonly userService: UserService
    ) {}

    ngOnInit(): void {
        this.initializeSession();
        this.hide = true;
        this.loginForm = new FormGroup({
            userId: new FormControl(null, Validators.required),
            password: new FormControl(null, Validators.required),
            keepMeSignedIn: new FormControl(false),
        });
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    login(): void {
        this.authenticationLoader = true;
        const empId = this.loginForm.get('userId').value;
        let password = this.loginForm.get('password').value;
        password = this.encryptDecryptService.encrypt(password);
        const keepMeSignedIn = this.loginForm.get('keepMeSignedIn').value;
        const empCredentials: LoginRequestPayload = {
            empId,
            password,
            keepMeSignedIn,
        };

        this.authService
            .login(empCredentials)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (resp: LoginResponse) => {
                    this.authenticationLoader = false;
                    if (resp && resp.data) {
                        const sessionData: UserSessionData = {
                            token: resp.data.token,
                            empId: resp.data.empId,
                            empName: resp.data.name,
                            manager: resp.data.manager,
                            title: resp.data.designation,
                            hasSubordinates: Boolean(
                                resp.data.subordinates &&
                                    resp.data.subordinates.length &&
                                    !EXTRA_FACILITY_PRACTICES.includes(
                                        resp.data.practice
                                    )
                            ),
                            email: resp.data.email,
                            designation: resp.data.designation,
                            practice: resp.data.practice,
                            subordinates: resp.data.subordinates,
                            approvalLevel: resp.data.approvalLevel,
                            roles: resp.data.roles,
                            assignedPractices: resp.data.assignedPractices,
                            isSuperAdmin: resp.data.isSuperAdmin,
                            isFirstTimeLogin: resp.data.isFirstTimeLogin,
                        };
                        this.userService.setUserSessionData(
                            JSON.stringify(sessionData)
                        );
                        if (
                            resp.data.approvalLevel === ApprovalLevel.l2 &&
                            resp.data.isSuperAdmin
                        ) {
                            this.router.navigate(['admin/pendingRequests']);
                        } else {
                            this.router.navigate(['booking']);
                        }
                    }
                },
                (error: HttpErrorResponse) => {
                    this.authenticationLoader = false;
                    this.invalidCreds = true;
                    if (error?.error?.message) {
                        this.errorMessage = error?.error.message;
                    } else {
                        this.errorMessage = 'Something went wrong!';
                    }
                    console.error(error);
                }
            );
    }

    private initializeSession(): void {
        this.userService.resetUser();
    }
}
