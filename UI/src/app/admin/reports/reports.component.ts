import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import * as moment from 'moment';
import { AdminService } from 'src/app/services/admin.service';
import { takeUntil } from 'rxjs/operators';
import {
    ReportSummaryRequestParams,
    ReportSummaryResponse,
    VisitReportSummaryRequestParams,
    VisitReportSummaryResponse,
} from 'src/app/models/admin.model';
import { Subject } from 'rxjs';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';
import { facilityWiseName } from '../block/block-facility/facility-details';
import { formatDate } from 'src/app/util/date-formats';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { ApprovalLevel, Role } from 'src/app/models/role';
import { RESPONSIBILTY_ASSIGN } from 'src/app/util/constants';
import { FloorCardsComponent } from './floor-cards/floor-cards.component';

@Component({
    selector: 'app-reports',
    templateUrl: './reports.component.html',
    styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
    isLoading = false;
    selectedIndex = 0;
    currentFacilityId = 'AAG';
    showVisitReport: boolean;
    isUserSuperAdmin: boolean;
    showAllCard: boolean;
    facilityWiseData = {
        AAG: [],
        ADISA: [],
        VANTAGE: [],
    };
    currentDate = moment();
    visitData: any;
    @ViewChild(FloorCardsComponent) floorCard: FloorCardsComponent;
    @ViewChild('vantageFloorCard') v9Floor: FloorCardsComponent;

    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    constructor(
        private adminService: AdminService,
        private notificationService: SnackBarService,
        private readonly router: Router,
        private readonly userService: UserService
    ) {}

    todaysDate = moment().format('L');
    selectedFilterDate = moment(this.todaysDate).toDate();

    ngOnInit(): void {
        this.showVisitCard();
        this.getCardDetailApi(this.currentDate);
    }

    onDateChange($event): void {
        this.currentDate = $event;
        this.getCardDetailApi(this.currentDate);
    }

    tabChanged($event): void {
        this.currentDate = moment(new Date());
        if ($event.index === 0) {
            this.floorCard.resetDate(this.currentDate);
        } else {
            this.v9Floor.resetDate(this.currentDate);
        }
        this.currentFacilityId = Object.keys(facilityWiseName).find(
            facilityNameIndex =>
                facilityWiseName[facilityNameIndex] === $event?.tab.textLabel
        );
        this.getFloorDetails(this.currentFacilityId, this.currentDate);

        if (
            $event.index === 0 &&
            (this.showVisitReport || this.isUserSuperAdmin)
        ) {
            this.getDetails(this.currentDate);
        }
    }

    onViewDetails(): void {
        this.router.navigate([
            '/admin/reports/visitapprovedsummary',
            formatDate(this.currentDate),
        ]);
    }

    private getFloorDetails(facilityId, date): void {
        this.isLoading = true;
        const reportSummaryRequestParams: ReportSummaryRequestParams = {
            facilityId,
            queryDate: formatDate(date),
        };
        this.adminService
            .getReportSummary(reportSummaryRequestParams)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: ReportSummaryResponse) => {
                    const CurrentFacilityID =
                        facilityWiseName[this.currentFacilityId];
                    this.facilityWiseData[CurrentFacilityID] = res.data;
                    this.isLoading = false;
                },
                (_error: HttpErrorResponse) => {
                    this.isLoading = false;
                    this.notificationService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private getDetails(bookingdate): void {
        const reportSummaryRequestParams: VisitReportSummaryRequestParams = {
            date: formatDate(bookingdate),
        };
        this.adminService
            .getVisitReportSummary(reportSummaryRequestParams)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: VisitReportSummaryResponse) => {
                    this.visitData = res.data.length;
                },
                (_error: HttpErrorResponse) => {
                    this.notificationService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private showVisitCard(): void {
        this.isUserSuperAdmin = this.userService?.getUserSessionData()?.isSuperAdmin;
        this.showAllCard =
            this.userService?.getUserSessionData()?.roles.length > 1;
        this.showVisitReport =
            this.userService?.getUserSessionData()?.approvalLevel ===
                ApprovalLevel.l2 &&
            this.userService
                ?.getUserSessionData()
                ?.roles.includes(RESPONSIBILTY_ASSIGN[1]);
    }

    private getCardDetailApi(currentDate): void {
        if (this.isUserSuperAdmin || this.showAllCard) {
            this.getFloorDetails(this.currentFacilityId, currentDate);
            this.getDetails(currentDate);
        } else if (!this.showVisitReport) {
            this.getFloorDetails(this.currentFacilityId, currentDate);
        } else {
            this.getDetails(currentDate);
        }
    }
}
