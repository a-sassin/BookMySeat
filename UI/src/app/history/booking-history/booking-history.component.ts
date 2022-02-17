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
    BookingHistoryResponse,
    CancelRequestParams,
    BookingHistoryParams,
    CancelBookingResponse,
} from 'src/app/models/booking-history-component.model';
import { SelectedSeat } from 'src/app/models/booking-component.model';
import { MatDialog } from '@angular/material/dialog';
import {
    DialogComponent,
    DialogProp,
} from 'src/app/common-component/dialog-component/dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { TablePaginationModel } from 'src/app/common-component/table-component/table.component';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { ApprovalLevel, Role } from 'src/app/models/role';
import { WebSocketService } from 'src/app/services/web-socket.service';
import {
    FACILITY_PRACTICES,
    FLOOR_MAPPING_TO_NAME,
    L1_ROLES,
    MAX_DATE_BOOKING,
    RESPONSIBILTY_ASSIGN,
    SOCKET_EVENTS,
} from 'src/app/util/constants';
import { SnackBarService } from 'src/app/services/snackbar.service';
import {
    BookingRequestStatuses,
    BOOKING_STATUS_MAP,
    BOOKING_STATUS_STYLES,
} from './booking-status-map';
import { formatDate } from 'src/app/util/date-formats';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';

interface BookedHistoryListItem {
    status: string;
    seatNumber: string[];
    date: string;
    requestId: string;
    bookedFor: string;
    reason: string;
    action: string;
    selectedSeats: SelectedSeat[];
    facilityName: string;
    remark: string;
    linkStatus?: boolean;
    blockedDates?: [];
    cancelledDates?: [];
}

@Component({
    selector: 'app-booking-history',
    templateUrl: './booking-history.component.html',
    styleUrls: ['./booking-history.component.scss'],
})
export class BookingHistoryComponent implements OnInit {
    bookedHistoryList: BookedHistoryListItem[] = [];
    tableLoader = false;
    paginationModel: TablePaginationModel = new TablePaginationModel();
    displayedColumns: string[] = [
        'date',
        'status',
        'facilityFloor',
        'seatNumber',
        'bookedFor',
        'requestId',
        'action',
    ];
    bookingHistoryTableFields: TableProperties[] = [
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
            fieldName: 'facilityFloor',
            headerName: 'Facility-Floor',
            cellContent: 'text',
        },
        {
            fieldName: 'seatNumber',
            headerName: 'Seat Numbers',
            cellContent: 'text',
        },
        {
            fieldName: 'bookedFor',
            headerName: 'Booked For',
            cellContent: 'text',
        },

        {
            fieldName: 'requestId',
            headerName: 'Request ID',
            cellContent: 'link',
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
    todayDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    minDate = moment()
        .add(-30, 'days')
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    maxDate = moment()
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
        private _snackBar: MatSnackBar,
        private readonly wsService: WebSocketService,
        private readonly snackBarService: SnackBarService
    ) {}

    ngOnInit(): void {
        const empDetails = this.userService.getUserSessionData();
        this.employeeID = empDetails.empId;
        this.employeeDesignation = empDetails.designation;
        this.fetchBookingHistory(this.getBookingHistoryRequiredParams());
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    onPaginationChange($event: PageEvent): void {
        const { pageIndex, pageSize } = $event;
        this.paginationModel.pageIndex = pageIndex;
        this.paginationModel.pageSize = pageSize;
        const bookingParam = this.getBookingHistoryRequiredParams();
        if (this.filterStatus) {
            bookingParam.currentStatus = this.filterStatus;
        }
        if (this.filterDate) {
            bookingParam.fromDate = this.filterDate;
        }
        this.fetchBookingHistory(bookingParam);
    }

    onIconClick($event): void {
        if ($event.iconClicked === 'Status') {
            const data: DialogProp = {
                id: 'blocked-floor-details-dialog',
                width: '600px',
                minHeight: '180px',
                panelClass: 'modelbox-styles',
                data: {
                    dialogType: 'status info',
                    closeButton: true,
                    title: `Request ID ${$event.row.requestId}`,
                    textArea: false,
                    info: $event.row,
                },
            };
            this.openDialog($event.row, data);
        }
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
                    warningMessage:
                        moment($event?.row?.fromDate).isBefore(
                            this.todayDate
                        ) && moment($event?.row?.toDate).isAfter(this.todayDate)
                            ? moment(this.todayDate)
                                  .add(1, 'day')
                                  .isSame($event?.row?.toDate, 'day')
                                ? `This will cancel your booking for ${moment(
                                      $event?.row?.toDate
                                  ).format('ll')}.`
                                : `This will cancel your booking from ${moment(
                                      this.todayDate
                                  )
                                      .add(1, 'day')
                                      .format('ll')} to ${moment(
                                      $event?.row?.toDate
                                  ).format('ll')}.`
                            : '',
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
        } else if ($event.columnName === 'Request ID') {
            let statusText = [];
            let progressAtStep;
            if (L1_ROLES.includes(this.employeeDesignation)) {
                statusText = [
                    'Request Submitted',
                    'Managers Approval',
                    'Admins Approval',
                    'Approved',
                ];
                progressAtStep =
                    $event.row.status === BookingRequestStatuses.PENDING_L2
                        ? 2
                        : $event.row.status === BookingRequestStatuses.APPROVED
                        ? 4
                        : 1;
            } else {
                statusText = [
                    'Request Submitted',
                    'Admins Approval',
                    'Approved',
                ];
                progressAtStep =
                    $event.row.status === BookingRequestStatuses.APPROVED
                        ? 3
                        : 1;
            }

            const data: DialogProp = {
                id: 'request-details-dialog',
                width: '625px',
                height: '420px',
                panelClass: 'modelbox-styles',
                data: {
                    dialogType: 'details',
                    closeButton: true,
                    title: `Request ID ${$event.row.requestId}`,
                    textArea: false,
                    info: $event.row,
                    progressBarData: {
                        statusText,
                        progressAtStep,
                    },
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
            ...this.getBookingHistoryRequiredParams(),
        };
        if (this.filterDate) {
            param.fromDate = formatDate(this.filterDate);
        }
        if (this.filterStatus) {
            param.currentStatus = this.filterStatus;
        }
        this.fetchBookingHistory(param);
    }

    onStatusFilterChange($event: StatusFilterEvent): void {
        const { value } = $event;
        this.filterStatus = value;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        const param: BookingHistoryParams = {
            ...this.getBookingHistoryRequiredParams(),
        };
        if (this.filterStatus) {
            param.currentStatus = this.filterStatus;
        }
        if (this.filterDate) {
            param.fromDate = formatDate(this.filterDate);
        }
        this.fetchBookingHistory(param);
    }

    onResetClick($event: ResetFilterEvent): void {
        // goto firstpage on reset filter
        this.paginationModel.pageIndex = 0;
        this.filterStatus = null;
        this.filterDate = null;
        const { value } = $event;
        if (value === 'reset') {
            this.fetchBookingHistory(this.getBookingHistoryRequiredParams());
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

    private getBookingHistoryRequiredParams(): BookingHistoryParams {
        const { pageIndex, pageSize } = this.paginationModel;
        return {
            requesterId: this.employeeID,
            offset: String(pageIndex * pageSize ?? 0),
            limit: String(pageSize),
            orderBy: 'fromDate',
            sortOrder: 'desc',
        };
    }

    private fetchBookingHistory(params: BookingHistoryParams): void {
        this.tableLoader = true;
        this.bookingService
            .getBookingHistory(params)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BookingHistoryResponse) => {
                    this.tableLoader = false;
                    const bookedHistoryData = res?.data || [];
                    this.bookedHistoryList = bookedHistoryData.map(request => ({
                        date:
                            request.fromDate === request.toDate
                                ? moment(request.fromDate).format('MMM D')
                                : `${moment(request.fromDate).format(
                                      'MMM D'
                                  )} - ${moment(request.toDate).format(
                                      'MMM D'
                                  )}`,
                        status:
                            BOOKING_STATUS_MAP[
                                request.currentStatus.toUpperCase()
                            ],
                        dynamicStyles:
                            BOOKING_STATUS_STYLES[
                                request.currentStatus.toUpperCase()
                            ],
                        requestId: request.requestId,
                        facilityId: request.facilityId,
                        floorNo: request?.floorNo,
                        facilityFloor: `${request?.facilityId} - ${
                            FLOOR_MAPPING_TO_NAME[request?.floorNo]
                        }`,
                        fromDate: request?.fromDate,
                        toDate: request?.toDate,
                        seatNumber: request.selectedSeats?.map(
                            seat => seat.seatNo
                        ),
                        bookedFor:
                            request.selectedSeats.length === 1 &&
                            request.selectedSeats[0].bookedFor.toLowerCase() ===
                                this.employeeID
                                ? 'Self'
                                : request.selectedSeats.length === 0
                                ? ''
                                : 'Team',
                        reason: request.requestSummary,
                        action: 'Cancel Request',
                        selectedSeats: request.selectedSeats,
                        facilityName: request.facilityName,
                        remark: request.rejectionReason,
                        blockedDates: request?.blockedDates?.sort(),
                        cancelledDates: request?.cancelledDates.sort(),
                        noOfSeats: request.selectedSeats.length,
                        linkStatus:
                            request.currentStatus === 'rejected-L1' ||
                            request.currentStatus === 'rejected-L2' ||
                            request.currentStatus === 'cancelled' ||
                            request.currentStatus === 'auto-cancelled' ||
                            (moment(request?.fromDate).isBefore(
                                this.todayDate
                            ) &&
                                moment(request?.toDate).isSameOrBefore(
                                    this.todayDate,
                                    'day'
                                ))
                                ? false
                                : true,
                    }));
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
        const {
            manager,
            practice,
            approvalLevel,
            roles,
        } = this.userService.getUserSessionData();
        const cancelledPayload: CancelRequestParams = {
            requestId: row.requestId,
            action: 'cancelled',
        };
        const role = RESPONSIBILTY_ASSIGN[0];
        this.bookingService
            .actionOnBookingRequest(cancelledPayload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: CancelBookingResponse) => {
                    this.tableLoader = false;
                    this.snackBarService.openSnackBar(
                        'Request Cancelled Successfully'
                    );
                    this.fetchBookingHistory(
                        this.getBookingHistoryRequiredParams()
                    );
                    if (
                        approvalLevel !== ApprovalLevel.l2 &&
                        !roles.includes(role)
                    ) {
                        if (row.status === 'Pending On Manager') {
                            this.wsService.emit(SOCKET_EVENTS.ACTIONED, {
                                manager,
                                practice:
                                    practice === 'IBM'
                                        ? FACILITY_PRACTICES[0]
                                        : practice,
                                roles: role,
                            });
                        } else {
                            this.wsService.emit(SOCKET_EVENTS.ACTIONED, {
                                practice:
                                    practice === 'IBM'
                                        ? FACILITY_PRACTICES[0]
                                        : practice,
                                roles: role,
                            });
                        }
                    }
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
        const { designation } = this.userService.getUserSessionData() || {};
        const selectOptions = [
            {
                displayValue: BookingRequestStatuses.PENDING_L1,
                value: 'pending-L1',
            },
            {
                displayValue: BookingRequestStatuses.PENDING_L2,
                value: 'pending-L2',
            },
            {
                displayValue: BookingRequestStatuses.REJECTED_L1,
                value: 'rejected-L1',
            },
            {
                displayValue: BookingRequestStatuses.REJECTED_L2,
                value: 'rejected-L2',
            },
            {
                displayValue: BookingRequestStatuses.APPROVED,
                value: 'approved',
            },
            {
                displayValue: BookingRequestStatuses.CANCELLED,
                value: 'cancelled',
            },
            {
                displayValue: BookingRequestStatuses.AUTO_CANCELLED,
                value: 'auto-cancelled',
            },
        ];

        if (designation === Role.ATM) {
            return selectOptions.filter(
                option => !['pending-L1', 'rejected-L1'].includes(option.value)
            );
        }

        return selectOptions;
    }
}
