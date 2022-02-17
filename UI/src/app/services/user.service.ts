import { Injectable } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { EmployeeList } from '../models/admin.model';
import {
    EmployeeSessionData,
    UserSessionData,
} from '../models/login-component.model';
import { EncryptDecryptService } from './encrypt-decrypt.service';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    readonly userExist: EventEmitter<void> = new EventEmitter<void>();
    readonly notficationReceived: EventEmitter<void> = new EventEmitter<void>();

    private _userSessionData: UserSessionData | null = null;
    private _employeeSessionData: EmployeeSessionData | null = null;

    constructor(private readonly encryptDecryptService: EncryptDecryptService) {
        this.initemployeeSessionData(
            JSON.parse(sessionStorage.getItem('employeeSessionData'))
        );
    }

    setUserSessionData(userSession: string): void {
        let _userSession = userSession;
        if (userSession) {
            _userSession = this.encryptDecryptService.encrypt(userSession);
        }
        localStorage.setItem('sessionData', _userSession);
        this.userExist.emit();
    }

    setemployeeSessionData(
        employeeSessionData: EmployeeList[],
        practice?: string
    ): void {
        if (employeeSessionData) {
            let seesionData = JSON.parse(
                sessionStorage.getItem('employeeSessionData')
            );
            if (practice) {
                seesionData = {
                    ...seesionData,
                    [practice]: employeeSessionData,
                };
                sessionStorage.setItem(
                    'employeeSessionData',
                    JSON.stringify(seesionData)
                );
            }

            this.initemployeeSessionData(seesionData);
            this.userExist.emit();
        }
    }

    getUserSessionData(): UserSessionData {
        if (!this._userSessionData) {
            const userSession = localStorage.getItem('sessionData');
            if (userSession) {
                const _uSessionData = this.encryptDecryptService.decrypt(
                    userSession
                );
                _uSessionData === 'Error'
                    ? (this._userSessionData = null)
                    : (this._userSessionData = JSON.parse(_uSessionData));
            } else {
                this._userSessionData = null;
            }
        }
        return this._userSessionData;
    }

    getemployeeSessionData(): EmployeeSessionData {
        return this._employeeSessionData;
    }

    resetUser(): void {
        if (this.getUserSessionData()?.token) {
            localStorage.removeItem('sessionData');
            sessionStorage.removeItem('employeeSessionData');
            this._userSessionData = null;
            this.setemployeeSessionData(null);
            this.userExist.emit();
        }
    }

    private initemployeeSessionData(
        employeeSession: EmployeeSessionData
    ): void {
        this._employeeSessionData = employeeSession;
    }
}
