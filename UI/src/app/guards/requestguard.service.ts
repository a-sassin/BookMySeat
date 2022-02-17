import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApprovalLevel } from '../models/role';
import { UserService } from '../services/user.service';
import { RESPONSIBILTY_ASSIGN } from '../util/constants';

@Injectable({
    providedIn: 'root',
})
export class RequestguardService implements CanActivate {
    constructor(private auth: UserService, private router: Router) {}
    canActivate(): boolean {
        if (
            this.auth?.getUserSessionData()?.isSuperAdmin ||
            this.auth
                ?.getUserSessionData()
                ?.roles.includes(RESPONSIBILTY_ASSIGN[0])
        ) {
            return true;
        }
        this.router.navigate(['/']);
        return false;
    }
}
