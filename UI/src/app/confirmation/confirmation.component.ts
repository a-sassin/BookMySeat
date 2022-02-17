import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import {
    EXTRA_FACILITY_PRACTICES,
    RESPONSIBILTY_ASSIGN,
} from '../util/constants';

@Component({
    selector: 'app-confirmation',
    templateUrl: './confirmation.component.html',
    styleUrls: ['./confirmation.component.scss'],
})
export class ConfirmationComponent implements OnInit {
    params: ConfirmationRouteParams;
    superAdmin: boolean;
    isSeatApprover: boolean;
    crossMarks = [
        { url: '../../assets/Group_16066.svg', name: 'group_16066' },
        { url: '../../assets/Group_16066.svg', name: 'group_16065' },
        { url: '../../assets/Group_16066.svg', name: 'group_16063' },
        { url: '../../assets/Group_16066.svg', name: 'group_16064' },
        { url: '../../assets/Group_16066.svg', name: 'group_16067' },
        { url: '../../assets/Group_16066.svg', name: 'group_16068' },
    ];
    constructor(
        private routes: ActivatedRoute,
        private router: Router,
        private userService: UserService
    ) {}

    ngOnInit(): void {
        this.routes.params.subscribe((res: ConfirmationRouteParams) => {
            this.params = res;
        });
        const {
            isSuperAdmin,
            roles,
            practice,
        } = this.userService?.getUserSessionData();
        this.superAdmin =
            isSuperAdmin || EXTRA_FACILITY_PRACTICES.includes(practice);
        this.isSeatApprover = roles?.includes(RESPONSIBILTY_ASSIGN[0]);
    }

    onCheckStatus(): void {
        this.router.navigate(['/bookingHistory']);
    }

    onRedirectHome(): void {
        this.router.navigate(['/booking']);
    }
}

interface ConfirmationRouteParams {
    bookingId: string;
}
