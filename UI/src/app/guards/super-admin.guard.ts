import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ApprovalLevel } from '../models/role';
import { UserService } from '../services/user.service';

@Injectable({
    providedIn: 'root',
})
export class SuperAdminGuard implements CanActivate {
    constructor(private auth: UserService, private router: Router) {}
    canActivate(): boolean {
        if (
            this.auth.getUserSessionData()?.isSuperAdmin ||
            (this.auth.getUserSessionData()?.approvalLevel !==
                ApprovalLevel.l2 &&
                this.auth.getUserSessionData()?.hasSubordinates)
        ) {
            return true;
        }
        this.router.navigate(['/']);
        return false;
    }
}
