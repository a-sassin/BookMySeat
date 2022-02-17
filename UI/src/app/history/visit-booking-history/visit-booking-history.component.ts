import { Component, OnInit } from '@angular/core';
import {
    FilterOptions,
    ResetFilterEvent,
    SelectOptions,
    StatusFilterEvent,
    TableProperties,
} from 'src/app/models/table-component.model';
import { BookingService } from 'src/app/services/booking.service';
import { UserService } from 'src/app/services/user.service';
import { takeUntil } from 'rxjs/operators';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import {
    CancelRequestParams,
    BookingHistoryParams,
    CancelBookingResponse,
    VisitBookingHistoryResponse,
} from 'src/app/models/booking-history-component.model';
import { MatDialog } from '@angular/material/dialog';
import {
    DialogComponent,
    DialogProp,
} from 'src/app/common-component/dialog-component/dialog.component';
import { PageEvent } from '@angular/material/paginator';
import { TablePaginationModel } from 'src/app/common-component/table-component/table.component';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { ApprovalLevel } from 'src/app/models/role';
import { SnackBarService } from 'src/app/services/snackbar.service';
import {
    BookingRequestStatuses,
    BOOKING_STATUS_MAP,
    BOOKING_STATUS_STYLES,
} from '../booking-history/booking-status-map';
import { formatDate } from 'src/app/util/date-formats';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';
import {
    MAX_DATE_BOOKING,
    NO_REASON,
    RESPONSIBILTY_ASSIGN,
    SOCKET_EVENTS,
} from 'src/app/util/constants';
import { WebSocketService } from 'src/app/services/web-socket.service';

interface VisitBookedHistoryListItem {
    status: string;
    date: string;
    requestId: string;
    category: string;
    concernedEmployee: string;
    reason: string;
    action: string;
    linkStatus?: boolean;
}

@Component({
    selector: 'app-visit-booking-history',
    templateUrl: './visit-booking-history.component.html',
    styleUrls: ['./visit-booking-history.component.scss'],
})
export class VisitBookingHistoryComponent implements OnInit {
    visitBookedHistoryList: VisitBookedHistoryListItem[] = [];
    tableLoader = false;
    paginationModel: TablePaginationModel = new TablePaginationModel();
    displayedColumns: string[] = [
        'requestId',
        'date',
        'status',
        'category',
        'concernedEmployee',
        'reason',
        'action',
    ];
    visitBookingHistoryTableFields: TableProperties[] = [
        {
            fieldName: 'requestId',
            headerName: 'Request ID',
            cellContent: 'text',
        },
        {
            fieldName: 'date',
            headerName: 'Date',
            cellContent: 'text',
        },
        {
            fieldName: 'status',
            headerName: 'Status',
            cellContent: 'text',
            dynamicStyleField: 'dynamicStyles',
        },
        {
            fieldName: 'category',
            headerName: 'Category',
            cellContent: 'text',
        },
        {
            fieldName: 'concernedEmployee',
            headerName: 'Concerned Employee',
            cellContent: 'text',
        },
        {
            fieldName: 'reason',
            headerName: 'Reason',
            cellContent: 'text',
        },
        {
            fieldName: 'action',
            headerName: 'Action',
            cellContent: 'link',
            allowLinkDisabling: true,
        },
    ];
    employeeID: string;
    employeeDesignation: string;
    todaysDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    minDate = moment()
        .add(-6, 'months')
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    maxDate = moment(this.todaysDate)
        .add(MAX_DATE_BOOKING, 'days')
        .format();
    filterOptions: FilterOptions[] = [
        {
            label: 'Enter Date',
            inputType: 'date-picker',
            minDate: this.minDate,
            maxDate: this.maxDate,
        },
        {
            label: 'Select Status',
            inputType: 'mat-select',
            selectOptions: this.getStatusFilterSelectOptions(),
        },
    ];
    filterDate: string | null = null;
    filterStatus: string | null = null;

    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    constructor(
        private readonly bookingService: BookingService,
        private readonly userService: UserService,
        public dialog: MatDialog,
        private readonly wsService: WebSocketService,
        private readonly snackBarService: SnackBarService
    ) {}

    ngOnInit(): void {
        const empDetails = this.userService.getUserSessionData();
        this.employeeID = empDetails.empId;
        this.fetchVisitBookingHistory(
            this.getVisitBookingHistoryRequiredParams()
        );
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    onPaginationChange($event: PageEvent): void {
        const { pageIndex, pageSize } = $event;
        this.paginationModel.pageIndex = pageIndex;
        this.paginationModel.pageSize = pageSize;
        const bookingParam = this.getVisitBookingHistoryRequiredParams();
        if (this.filterStatus) {
            bookingParam.currentStatus = this.filterStatus;
        }
        if (this.filterDate) {
            bookingParam.date = this.filterDate;
        }
        this.fetchVisitBookingHistory(bookingParam);
    }

    onLinkClick($event): void {
        if ($event.linkClicked === 'Cancel Request') {
            const data: DialogProp = {
                id: 'cancel-request-dialog',
                width: '500px',
                minHeight: '250px',
                panelClass: 'modelbox-styles',
                data: {
                    dialogType: 'confirmation',
                    title: `Request ID ${$event.row.requestId}`,
                    proceed: true,
                    message: `Are you sure you want to cancel this booking?`,
                    textArea: false,
                    closeButton: true,
                    buttonProp: [
                        {
                            buttonText: 'Yes',
                            dialogCloseText: 'proceed',
                            buttonColor: 'basic',
                        },
                        {
                            buttonText: 'No',
                            dialogCloseText: 'cancel-proceed',
                            buttonColor: 'primary',
                        },
                    ],
                },
            };
            this.openDialog($event.row, data);
        }
    }

    onDateFilterChange($event: MatDatepickerInputEvent<Date>): void {
        const { value } = $event;
        this.filterDate = value ? value.toISOString() : null;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        const param: BookingHistoryParams = {
            ...this.getVisitBookingHistoryRequiredParams(),
        };
        if (this.filterDate) {
            param.date = formatDate(this.filterDate);
        }
        if (this.filterStatus) {
            param.currentStatus = this.filterStatus;
        }
        this.fetchVisitBookingHistory(param);
    }

    onStatusFilterChange($event: StatusFilterEvent): void {
        const { value } = $event;
        this.filterStatus = value;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        const param: BookingHistoryParams = {
            ...this.getVisitBookingHistoryRequiredParams(),
        };
        if (this.filterStatus) {
            param.currentStatus = this.filterStatus;
        }
        if (this.filterDate) {
            param.date = formatDate(this.filterDate);
        }
        this.fetchVisitBookingHistory(param);
    }

    onResetClick($event: ResetFilterEvent): void {
        // goto firstpage on reset filter
        this.paginationModel.pageIndex = 0;
        this.filterStatus = null;
        this.filterDate = null;
        const { value } = $event;
        if (value === 'reset') {
            this.fetchVisitBookingHistory(
                this.getVisitBookingHistoryRequiredParams()
            );
        }
    }

    private openDialog(rowInfo, data): void {
        const dialogRef = this.dialog.open(DialogComponent, data);

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.proceed === 'proceed') {
                this.cancelRequest(rowInfo);
            }
        });
    }

    private getVisitBookingHistoryRequiredParams(): BookingHistoryParams {
        const { pageIndex, pageSize } = this.paginationModel;
        return {
            requesterId: this.employeeID,
            offset: String(pageIndex * pageSize ?? 0),
            limit: String(pageSize),
            orderBy: 'date',
            sortOrder: 'desc',
        };
    }

    private fetchVisitBookingHistory(params: BookingHistoryParams): void {
        this.tableLoader = true;
        this.bookingService
            .getVisitBookingHistory(params)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: VisitBookingHistoryResponse) => {
                    this.tableLoader = false;
                    const bookedHistoryData = res?.data || [];
                    this.visitBookedHistoryList = bookedHistoryData.map(
                        request => ({
                            date: moment(request.date).format('LL'),
                            status:
                                BOOKING_STATUS_MAP[
                                    request.currentStatus.toUpperCase()
                                ],
                            dynamicStyles:
                                BOOKING_STATUS_STYLES[
                                    request.currentStatus.toUpperCase()
                                ],
                            requestId: request.requestId,
                            category: request.category,
                            concernedEmployee: request.concernedEmpName,
                            reason: request.requestSummary
                                ? request.requestSummary
                                : NO_REASON,
                            action: 'Cancel Request',
                            linkStatus:
                                request.currentStatus === 'rejected' ||
                                request.currentStatus === 'cancelled' ||
                                moment(request?.date).isBefore(this.todaysDate)
                                    ? false
                                    : true,
                        })
                    );
                    this.paginationModel.totalRecords = res?.pagination?.total;
                },
                _error => {
                    this.tableLoader = false;
                    this.snackBarService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private cancelRequest(row): void {
        this.tableLoader = true;
        const cancelledPayload: CancelRequestParams = {
            requestId: row.requestId,
            action: 'cancelled',
        };
        const {
            practice,
            approvalLevel,
            roles,
        } = this.userService.getUserSessionData();
        const role = RESPONSIBILTY_ASSIGN[1];
        this.bookingService
            .actionOnVisitBookingRequest(cancelledPayload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: CancelBookingResponse) => {
                    if (
                        approvalLevel !== ApprovalLevel.l2 &&
                        !roles.includes(role)
                    ) {
                        this.wsService.emit(SOCKET_EVENTS.ACTIONED, {
                            practice,
                            roles: role,
                        });
                    }
                    this.tableLoader = false;
                    this.snackBarService.openSnackBar(
                        'Request Cancelled Successfully'
                    );
                    this.fetchVisitBookingHistory(
                        this.getVisitBookingHistoryRequiredParams()
                    );
                },
                _error => {
                    this.tableLoader = false;
                    this.snackBarService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private getStatusFilterSelectOptions(): SelectOptions[] {
        const { approvalLevel } = this.userService.getUserSessionData() || {};
        const selectOptions = [
            {
                displayValue: BookingRequestStatuses.PENDING,
                value: 'pending',
            },
            {
                displayValue: BookingRequestStatuses.REJECTED,
                value: 'rejected',
            },
            {
                displayValue: BookingRequestStatuses.APPROVED,
                value: 'approved',
            },
            {
                displayValue: BookingRequestStatuses.CANCELLED,
                value: 'cancelled',
            },
        ];
        if (approvalLevel === ApprovalLevel.l2) {
            return selectOptions.filter(
                option => !['pending', 'rejected'].includes(option.value)
            );
        }
        return selectOptions;
    }
}
