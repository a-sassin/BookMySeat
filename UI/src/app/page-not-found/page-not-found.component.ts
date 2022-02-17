import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserSessionData } from '../models/login-component.model';
import { ApprovalLevel } from '../models/role';
import { UserService } from '../services/user.service';

@Component({
    selector: 'app-page-not-found',
    templateUrl: './page-not-found.component.html',
    styleUrls: ['./page-not-found.component.scss'],
})
export class PageNotFoundComponent implements OnInit {
    chairs = [
        { url: '../../assets/chair.png', name: 'chair1' },
        { url: '../../assets/chair.png', name: 'chair2' },
        { url: '../../assets/chair.png', name: 'chair3' },
    ];
    employeeData: UserSessionData;

    constructor(
        private router: Router,
        private readonly userService: UserService
    ) {}

    ngOnInit(): void {}

    onRedirectHome(): void {
        // add a check for admin and route it to admin home page
        if (
            this.userService?.getUserSessionData()?.approvalLevel ===
                ApprovalLevel.l2 &&
            this.userService?.getUserSessionData()?.isSuperAdmin
        ) {
            this.router.navigate(['admin/pendingRequests']);
        } else {
            this.router.navigate(['/booking']); // this is for norml user
        }
    }
}
