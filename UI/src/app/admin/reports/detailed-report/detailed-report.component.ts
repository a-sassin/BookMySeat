import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    DownloadReportRequestParams,
    ReportSummaryRequestParams,
    ReportSummaryResponse,
    ReportSummaryDetailsResponse,
} from 'src/app/models/admin.model';
import { FloorBookingList } from 'src/app/models/reports-component.model';
import { TableProperties } from 'src/app/models/table-component.model';
import { AdminService } from 'src/app/services/admin.service';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { FLOOR_MAPPING_TO_NAME } from 'src/app/util/constants';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';

@Component({
    selector: 'app-detailed-report',
    templateUrl: './detailed-report.component.html',
    styleUrls: ['./detailed-report.component.scss'],
})
export class DetailedReportComponent implements OnInit {
    displayedColumns: string[] = [
        'index',
        'seatNo',
        'bookedFor',
        'bookedForName',
    ];
    floorBookingList: FloorBookingList[] = [];
    tableLoader = false;
    facilityId = '';
    floorNo = '';
    buttonLoader = false;
    masterTableFields: TableProperties[] = [
        {
            fieldName: 'index',
            headerName: 'Index',
            cellContent: 'text',
        },
        {
            fieldName: 'seatNo',
            headerName: 'Seat Num',
            cellContent: 'text',
        },
        {
            fieldName: 'bookedFor',
            headerName: 'Employee Id',
            cellContent: 'number',
        },
        {
            fieldName: 'bookedForName',
            headerName: 'Employee Name',
            cellContent: 'text',
        },
    ];
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    private bookingDate = '';

    constructor(
        private activatedRoute: ActivatedRoute,
        private adminService: AdminService,
        private notificationService: SnackBarService
    ) {}

    ngOnInit(): void {
        this.initUrlParams();
        this.getFloorDetails(this.floorNo, this.facilityId, this.bookingDate);
    }

    onDownloadClick(): void {
        this.buttonLoader = true;
        this.downloadReport();
    }

    getFloorDisplayValue(floorNo): string {
        return FLOOR_MAPPING_TO_NAME[floorNo];
    }

    getFormattedDate(): string {
        return moment(this.bookingDate, 'DD-MM-YYYY').format('LL');
    }

    private initUrlParams(): void {
        this.activatedRoute.params.subscribe(params => {
            this.facilityId = params.facilityId;
            this.floorNo = params.floorId;
            this.bookingDate = params.date;
        });
    }

    private getFloorDetails(floorNo, facilityId, date): void {
        this.tableLoader = true;
        const reportSummaryRequestParams: ReportSummaryRequestParams = {
            facilityId,
            queryDate: date,
            floorNo,
        };
        this.adminService
            .getReportSummaryDetails(reportSummaryRequestParams)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: ReportSummaryDetailsResponse) => {
                    const floorData = res.data;
                    this.floorBookingList = floorData.map(
                        (floor, index): FloorBookingList => ({
                            index: index + 1,
                            seatNo: floor.seatNo,
                            bookedFor: floor.bookedFor.toLowerCase(),
                            bookedForName: floor.bookedForName,
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

    private downloadExcelHelper(
        fileBlob,
        { facilityId, floorNo, bookingDate }
    ): void {
        const blob = new Blob([fileBlob], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute(
                'download',
                `seat_booking_${facilityId}-Floor-${floorNo}-(${this.getFormattedDate()}).xlsx`
            );
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    private downloadReport(): void {
        if (!this.facilityId || !this.floorNo || !this.bookingDate) {
            return;
        }
        const downloadParams: DownloadReportRequestParams = {
            facilityId: this.facilityId,
            floorNo: this.floorNo,
            bookingDate: this.bookingDate,
        };

        this.adminService
            .downloadReport(downloadParams)
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
