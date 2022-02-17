import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApprovalLevel } from '../models/role';
import { UserService } from '../services/user.service';
import { RESPONSIBILTY_ASSIGN } from '../util/constants';
@Component({
    selector: 'app-requests',
    templateUrl: './requests.component.html',
    styleUrls: ['./requests.component.scss'],
})
export class RequestsComponent implements OnInit {
    selectedIndex = 0;
    showSeatRequest: boolean = false;
    showVisitRequest: boolean = false;
    constructor(
        private readonly userService: UserService,
        private readonly router: Router,
        private readonly route: ActivatedRoute
    ) {}
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    ngOnInit(): void {
        this.showSeatRequest =
            this.userService?.getUserSessionData()?.isSuperAdmin ||
            (this.userService?.getUserSessionData()?.approvalLevel ===
                ApprovalLevel.l2 &&
                this.userService
                    ?.getUserSessionData()
                    ?.roles.includes(RESPONSIBILTY_ASSIGN[0])) ||
            this.userService.getUserSessionData()?.hasSubordinates;
        this.showVisitRequest =
            this.userService?.getUserSessionData()?.isSuperAdmin ||
            (this.userService?.getUserSessionData()?.approvalLevel ===
                ApprovalLevel.l2 &&
                this.userService
                    ?.getUserSessionData()
                    ?.roles.includes(RESPONSIBILTY_ASSIGN[1]));

        this.route.queryParams
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(params => {
                if (params.check === 'visitBookingPendingRequest') {
                    this.selectedIndex = 1;
                } else if (params.check === 'seatBookingPendingRequest') {
                    this.selectedIndex = 0;
                }
            });
    }

    onTabChange(event): void {
        event.index === 0
            ? this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: { check: 'seatBookingPendingRequest' },
              })
            : this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: { check: 'visitBookingPendingRequest' },
              });
    }
}
