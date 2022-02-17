import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable({
    providedIn: 'root',
})
export class AuthGuard implements CanActivate {
    constructor(
        private readonly router: Router,
        private readonly userService: UserService
    ) {}
    canActivate(): boolean {
        if (this.userService.getUserSessionData()?.token) {
            return true;
        } else {
            this.router.navigate(['/login']);
            return false;
        }
    }
}
