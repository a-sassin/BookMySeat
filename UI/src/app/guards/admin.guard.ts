import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { ApprovalLevel } from '../models/role';
import { UserService } from '../services/user.service';
@Injectable({
    providedIn: 'root',
})
export class AdminGuard implements CanActivate {
    constructor(private auth: UserService, private router: Router) {}
    canActivate(): boolean {
        if (
            this.auth.getUserSessionData()?.approvalLevel === ApprovalLevel.l2
        ) {
            return true;
        }
        this.router.navigate(['/']);
        return false;
    }
}
