import { Component, OnDestroy, OnInit, Output } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { UserService } from '../services/user.service';
import { UserSessionData } from '../models/login-component.model';
import { WebSocketService } from '../services/web-socket.service';
import { takeUntil } from 'rxjs/operators';
import { ApprovalLevel } from '../models/role';
import * as moment from 'moment';
import { RESPONSIBILTY_ASSIGN } from '../util/constants';
@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
    initials: string;
    employeeName: string;
    notificationCount = {
        seatBookingCount: 0,
        visitBookingCount: 0,
        totalBookingCount: 0,
    };
    showNotification: boolean;

    @Output() menuClick = new EventEmitter();

    employeeData: UserSessionData;

    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    constructor(
        private readonly userService: UserService,
        private readonly router: Router,
        private readonly wsService: WebSocketService
    ) {}

    todaysDate = moment().format('LLL');

    ngOnInit(): void {
        this.getNotificationCount();
        this.employeeData = this.userService.getUserSessionData();
        this.employeeName = this.employeeData ? this.employeeData.empName : '';
        this.generateInitials();
        this.setShowNotification();
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    menuClicked(): void {
        this.menuClick.emit('menu');
    }

    menuClosed(): void {
        this.menuClick.emit();
    }

    private getNotificationCount() {
        this.wsService
            .listen()
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe((notification: any) => {
                if (
                    (this.router.url === '/admin/pendingRequests' ||
                        this.router.url === '/pendingRequests' ||
                        this.router.url ===
                            '/admin/pendingRequests?check=seatBookingPendingRequest' ||
                        this.router.url ===
                            '/pendingRequests?check=seatBookingPendingRequest') &&
                    this.notificationCount.seatBookingCount !=
                        notification.seatBookingCount
                ) {
                    this.userService.notficationReceived.emit();
                } else if (
                    this.router.url ===
                        '/admin/pendingRequests?check=visitBookingPendingRequest' &&
                    this.notificationCount.visitBookingCount !=
                        notification.visitBookingCount
                ) {
                    this.userService.notficationReceived.emit();
                }
                this.notificationCount = notification;
            });
    }

    private generateInitials(): void {
        if (this.employeeData && this.employeeData.empName) {
            const names: string[] = this.employeeData.empName.split(' ');
            names.length > 1
                ? (this.initials =
                      `${names[0].charAt(0)}` + `${names[1].charAt(0)}`)
                : (this.initials =
                      `${names[0].charAt(0)}` + `${names[0].charAt(1)}`);
        } else {
            this.initials = `G`;
        }
    }

    private setShowNotification(): void {
        const { hasSubordinates, approvalLevel, isSuperAdmin, roles } =
            this.employeeData || {};
        this.showNotification =
            hasSubordinates ||
            isSuperAdmin ||
            approvalLevel === ApprovalLevel.l2;
    }

    logout() {
        this.router.navigate(['logout']);
    }

    checkParams(): boolean {
        if (
            (this.router.url === '/admin/pendingRequests' &&
                this.userService.getUserSessionData()?.isSuperAdmin) ||
            this.router.url === '/booking'
        )
            return true;
        return false;
    }

    addBody(): any {
        return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=bms_support@gslab.com&su=Bug Report: ${
            this.todaysDate
        }&body=${encodeURIComponent(
            'What Happened?\n\n\nExpected result\n\n\nSteps to reproduce\n\n\nScreenshots\n'
        )}`;
    }

    onSeatPendingRequestClick(): void {
        const routeUrl =
            this.employeeData?.approvalLevel === ApprovalLevel.l2
                ? '/admin/pendingRequests'
                : '/pendingRequests';
        this.router.navigate([routeUrl], {
            queryParams: { check: 'seatBookingPendingRequest' },
        });
        this.menuClosed();
    }

    onVisitPendingRequestClick(): void {
        this.router.navigate(['/admin/pendingRequests'], {
            queryParams: { check: 'visitBookingPendingRequest' },
        });
    }

    isSeatBookingRole() {
        const isSeatBookingLink =
            this.employeeData.isSuperAdmin ||
            this.employeeData.subordinates ||
            this.employeeData.roles?.includes(RESPONSIBILTY_ASSIGN[0]);
        return isSeatBookingLink;
    }

    isVisitBookingRole() {
        const isVisitBookingLink =
            this.employeeData.isSuperAdmin ||
            this.employeeData.roles?.includes(RESPONSIBILTY_ASSIGN[1]);
        return isVisitBookingLink;
    }
}
