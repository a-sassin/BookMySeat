import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    DownloadVisitReportRequestParams,
    VisitReportSummaryRequestParams,
    VisitReportSummaryResponse,
} from 'src/app/models/admin.model';
import { VisitBookingList } from 'src/app/models/reports-component.model';
import { TableProperties } from 'src/app/models/table-component.model';
import { AdminService } from 'src/app/services/admin.service';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';

@Component({
    selector: 'app-visit-report',
    templateUrl: './visit-report.component.html',
    styleUrls: ['./visit-report.component.scss'],
})
export class VisitReportComponent implements OnInit {
    constructor(
        private activatedRoute: ActivatedRoute,
        private adminService: AdminService,
        private notificationService: SnackBarService
    ) {}
    displayedColumns: string[] = ['empId', 'category', 'concernedEmpName'];
    visitBookingList: VisitBookingList[] = [];
    tableLoader = false;
    facilityId = '';
    floorNo = '';
    buttonLoader = false;
    masterTableFields: TableProperties[] = [
        {
            fieldName: 'empId',
            headerName: 'Emp Id',
            cellContent: 'text',
        },
        {
            fieldName: 'category',
            headerName: 'Category',
            cellContent: 'number',
        },
        {
            fieldName: 'concernedEmpName',
            headerName: 'Concerned Person Name',
            cellContent: 'text',
        },
    ];
    private bookingDate = '';
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    ngOnInit(): void {
        this.initUrlParams();
        this.getDetails(this.bookingDate);
    }

    private initUrlParams(): void {
        this.activatedRoute.params.subscribe(params => {
            this.bookingDate = params.date;
        });
    }

    private getDetails(bookingdate): void {
        this.tableLoader = true;
        const reportSummaryRequestParams: VisitReportSummaryRequestParams = {
            date: bookingdate,
        };
        this.adminService
            .getVisitReportSummary(reportSummaryRequestParams)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: VisitReportSummaryResponse) => {
                    const visitData = res.data;
                    this.visitBookingList = visitData.map(
                        (res): VisitBookingList => ({
                            empId: res.empId,
                            category: res.category,
                            concernedEmpName: res.concernedEmpName,
                        })
                    );
                    this.tableLoader = false;
                },
                (_error: HttpErrorResponse) => {
                    this.tableLoader = false;
                    this.notificationService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    ondownloadClick(): void {
        this.buttonLoader = true;
        this.downloadReport();
    }

    getFormattedDate(): string {
        return moment(this.bookingDate, 'DD-MM-YYYY').format('LL');
    }

    private downloadExcelHelper(fileBlob, { date }): void {
        const blob = new Blob([fileBlob], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute(
                'download',
                `visit_booking_${this.getFormattedDate()}.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    private downloadReport(): void {
        if (!this.bookingDate) {
            return;
        }
        const downloadParams: DownloadVisitReportRequestParams = {
            date: this.bookingDate,
        };

        this.adminService
            .downloadVisitReport(downloadParams)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (file: Blob) => {
                    // for downloading excel
                    this.buttonLoader = false;
                    this.downloadExcelHelper(file, downloadParams);
                },
                (_error: HttpErrorResponse) => {
                    this.buttonLoader = false;

                    // FileReader Object used for reading files or blob objects.
                    // We need FileReader because we are getting Blob in _error.error
                    const reader = new FileReader();

                    // reads the contents of the specified Blob (in this case _error.error is a blob)
                    // after finished reading, the result attribute contains the contents of the file as a text string
                    reader.readAsText(_error.error);

                    // the onload event is triggered after file read operation is successfully completed,
                    // We need to handle file reader onload callback
                    reader.onload = () => {
                        const errorMessage = JSON.parse(
                            reader?.result?.toString()
                        );
                        this.notificationService.openSnackBar(
                            ErrorMessageUtil.getErrorMessage(errorMessage)
                        );
                    };
                }
            );
    }
}
