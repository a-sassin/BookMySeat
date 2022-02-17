import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    ActionClickedEvent,
    PendingApprovalListItem,
    BookingActionResponse,
    BookingActionPayload,
    PendingApprovalsParams,
} from 'src/app/models/pending-approval-component.model';
import { PendingApprovalResponse } from 'src/app/models/pending-approval-component.model';
import {
    FilterOptions,
    ResetFilterEvent,
    TableProperties,
} from 'src/app/models/table-component.model';
import { BookingService } from 'src/app/services/booking.service';
import { UserService } from 'src/app/services/user.service';
import {
    DialogComponent,
    DialogProp,
} from 'src/app/common-component/dialog-component/dialog.component';
import { PageEvent } from '@angular/material/paginator';
import { TablePaginationModel } from 'src/app/common-component/table-component/table.component';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { WebSocketService } from 'src/app/services/web-socket.service';
import {
    ANONYMOUS_ERROR,
    FACILITY_PRACTICES,
    FLOOR_MAPPING_TO_NAME,
    INVALID_REJECTION_REMARK,
    MAX_DATE_BOOKING,
    RESPONSIBILTY_ASSIGN,
    SOCKET_EVENTS,
    VACCINATION_STATUS,
} from 'src/app/util/constants';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { Router } from '@angular/router';
import { formatDate } from 'src/app/util/date-formats';
@Component({
    selector: 'app-pending-approval',
    templateUrl: './pending-approval.component.html',
    styleUrls: ['./pending-approval.component.scss'],
})
export class PendingApprovalComponent implements OnInit, OnDestroy {
    pendingApprovalList: PendingApprovalListItem[] = [];
    tableLoader = false;
    paginationModel: TablePaginationModel = new TablePaginationModel();
    displayedColumns: string[] = [
        'requestId',
        'empId',
        'date',
        'facilityFloor',
        'bookedBy',
        'reason',
        'actions',
    ];
    masterTableFields: TableProperties[] = [
        {
            fieldName: 'requestId',
            headerName: 'Request ID',
            cellContent: 'link',
        },
        {
            fieldName: 'empId',
            headerName: 'Employee Id',
            cellContent: 'text',
            dynamicStyleField: 'dynamicStyles',
        },
        {
            fieldName: 'date',
            headerName: 'Date',
            cellContent: 'text',
        },
        {
            fieldName: 'facilityFloor',
            headerName: 'Facility-Floor',
            cellContent: 'text',
        },
        {
            fieldName: 'bookedBy',
            headerName: 'Booked By',
            cellContent: 'text',
        },
        {
            fieldName: 'reason',
            headerName: 'Reason for Booking',
            cellContent: 'text',
        },

        {
            fieldName: 'actions',
            headerName: 'Actions',
            cellContent: 'button',
            buttonProperties: [
                {
                    value: 'reject',
                    buttonText: 'Reject',
                    style: 'margin-right: 1rem',
                },
                {
                    value: 'approve',
                    buttonText: 'Approve',
                    color: 'primary',
                    disableButton: true,
                },
            ],
        },
    ];

    masterTableFieldsMobile: TableProperties[] = [
        ...this.masterTableFields,
        {
            fieldName: 'iconAction',
            headerName: 'Actions',
            cellContent: 'classIcon',
            iconClass: [
                {
                    value: 'Reject',
                    class: 'clear',
                    style: 'margin-right: 1.2rem ; color:#c40000',
                },
                {
                    value: 'Approve',
                    class: 'check',
                    style: 'color:#06a125',
                },
            ],
        },
    ];

    todaysDate = moment()
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
            minDate: this.todaysDate,
            maxDate: this.maxDate,
        },
    ];
    filterDate: string = null;
    screenWidth: any;

    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    constructor(
        private readonly bookingService: BookingService,
        private readonly userService: UserService,
        public dialog: MatDialog,
        private readonly wsService: WebSocketService,
        private readonly snackBarService: SnackBarService,
        private readonly router: Router
    ) {}

    ngOnInit(): void {
        this.listenForNotifications();
        this.getPendingApprovals(this.getPendingApprovalRequiredParams());
        this.onResize();
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.screenWidth = window.innerWidth;
        if (this.screenWidth < 600) {
            this.displayedColumns = ['requestId', 'empId', 'iconAction'];
            this.masterTableFields = this.masterTableFieldsMobile;
        }
        this.displayedColumns;
        this.masterTableFields;
    }

    onButtonClicked(buttonEvent: ActionClickedEvent): void {
        const seat = buttonEvent && buttonEvent.row;
        const action = (buttonEvent.buttonClicked || '').toLocaleLowerCase();
        if (!seat) {
            return;
        }
        const { requestId, practice } = seat;

        if (action === 'approve') {
            this.sendactionOnBookingRequest(requestId, true, '', practice);
        }

        if (action === 'reject') {
            const data: DialogProp = {
                id: 'reject-request-dialog',
                width: '500px',
                minHeight: '330px',
                panelClass: 'modelbox-styles',
                data: {
                    dialogType: 'confirm rejection',
                    title: `Request ID ${requestId}`,
                    closeButton: true,
                    proceed: true,
                    message: `Reject with Comment`,
                    textArea: true,
                    textAreaPlaceholder: 'Remark',
                    buttonProp: [
                        {
                            buttonText: 'Reject',
                            dialogCloseText: 'proceed',
                            buttonValidation: true,
                            buttonColor: 'primary',
                        },
                    ],
                },
            };

            this.openDialog(requestId, data, practice);
        }
    }

    onPaginationChange($event: PageEvent): void {
        const { pageIndex, pageSize } = $event;
        this.paginationModel.pageIndex = pageIndex;
        this.paginationModel.pageSize = pageSize;
        const params: PendingApprovalsParams = this.getPendingApprovalRequiredParams();
        if (this.filterDate) {
            params.date = this.filterDate;
        }
        this.getPendingApprovals(params);
    }

    onDateFilterChange($event: MatDatepickerInputEvent<Date>): void {
        const { value } = $event;
        this.filterDate = value ? formatDate(value) : null;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        const param: PendingApprovalsParams = {
            ...this.getPendingApprovalRequiredParams(),
        };
        if (this.filterDate) {
            param.date = this.filterDate;
        }
        this.getPendingApprovals(param);
    }

    onResetClick($event: ResetFilterEvent): void {
        this.filterDate = null;
        const { value } = $event;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        if (value === 'reset') {
            this.getPendingApprovals(this.getPendingApprovalRequiredParams());
        }
    }

    onLinkClick($event): void {
        if ($event.columnName === 'Request ID') {
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
                },
            };
            this.openDialog($event.row, data, '');
        }
    }

    private getPendingApprovalRequiredParams(): PendingApprovalsParams {
        const { pageIndex, pageSize } = this.paginationModel;
        const { empId } = this.userService.getUserSessionData();
        return {
            approverId: empId,
            offset: String(pageIndex * pageSize ?? 0),
            limit: String(pageSize),
            orderBy: 'fromDate',
            sortOrder: 'asc',
        };
    }

    private openDialog(requestId, data, practice): void {
        const dialogRef = this.dialog.open(DialogComponent, data);

        dialogRef
            .afterClosed()
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(result => {
                if (result && result.proceed === 'proceed') {
                    if (result.content.trim()) {
                        this.sendactionOnBookingRequest(
                            requestId,
                            false,
                            result.content,
                            practice
                        );
                    } else {
                        this.snackBarService.openSnackBar(
                            INVALID_REJECTION_REMARK
                        );
                    }
                }
            });
    }

    private sendactionOnBookingRequest(
        requestId: string,
        isApproved: boolean,
        actionNote,
        practice
    ) {
        this.tableLoader = true;
        const rejectL1Payload: BookingActionPayload = {
            requestId,
            action: isApproved ? 'approved' : 'rejected', // #TODO use constants file
            rejectionReason: actionNote,
        };
        if (isApproved) {
            delete rejectL1Payload.rejectionReason;
        }
        const roles = RESPONSIBILTY_ASSIGN[0];
        this.bookingService
            .actionOnBookingRequest(rejectL1Payload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BookingActionResponse) => {
                    this.wsService.emit(SOCKET_EVENTS.ACTIONED, {
                        practice:
                            practice === 'IBM'
                                ? FACILITY_PRACTICES[0]
                                : practice,
                        roles,
                    });

                    this.tableLoader = false;
                    const action = isApproved ? 'Approved' : 'Rejected';
                    const message =
                        res && res.status === 200
                            ? `Request ID - ${requestId} has been ${action}`
                            : ANONYMOUS_ERROR;

                    this.snackBarService.openSnackBar(message);
                    // Fetch the list again
                    const params: PendingApprovalsParams = {
                        ...this.getPendingApprovalRequiredParams(),
                    };
                    // for fetching list accordingly if current date filter is applied on ui
                    if (this.filterDate) {
                        params.date = this.filterDate;
                    }
                    this.getPendingApprovals(params);
                },
                (_error: any) => {
                    this.tableLoader = false;
                    this.snackBarService.openSnackBar(ANONYMOUS_ERROR);
                }
            );
    }

    private getPendingApprovals(params: PendingApprovalsParams): void {
        this.tableLoader = true;
        this.bookingService
            .getPendingApprovals(params)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: PendingApprovalResponse) => {
                    this.tableLoader = false;
                    const pendingApprovalData = res?.data || [];
                    this.pendingApprovalList = pendingApprovalData.map(
                        request => ({
                            empId: request.empId.toUpperCase(),
                            dynamicStyles: request.vaccinationStatus
                                ? VACCINATION_STATUS.vaccinatedStyle
                                : VACCINATION_STATUS.notVaccinatedStyle,
                            requestId: request?.requestId,
                            seatNumber: request?.selectedSeats?.map(
                                seat => seat.seatNo
                            ),
                            date:
                                request.fromDate === request.toDate
                                    ? moment(request.fromDate).format('MMM D')
                                    : ` ${moment(request.fromDate).format(
                                          'MMM D'
                                      )} - ${moment(request.toDate).format(
                                          'MMM D'
                                      )}`,
                            bookedBy: request?.bookedByName,
                            reason: request?.requestSummary,
                            subordinates: request?.selectedSeats,
                            practice: request?.practice,
                            facilityFloor: `${request?.facilityId} - ${
                                FLOOR_MAPPING_TO_NAME[request?.floorNo]
                            }`,
                            facilityName: request.facilityName,
                            bookedFor:
                                request?.selectedSeats?.length === 1 &&
                                request?.selectedSeats[0]?.bookedFor?.toLowerCase() ===
                                    request?.empId?.toLowerCase()
                                    ? 'Self'
                                    : request?.selectedSeats?.length === 0
                                    ? ''
                                    : 'Team',
                            buttonStatus: moment(request?.fromDate).isBefore(
                                this.todaysDate
                            )
                                ? false
                                : true,
                        })
                    );
                    this.paginationModel.totalRecords = res?.pagination?.total;
                },
                _error => {
                    this.tableLoader = false;
                }
            );
    }

    //  Fetching latest data on self route
    private listenForNotifications(): void {
        this.userService.notficationReceived
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => {
                this.getPendingApprovals(
                    this.getPendingApprovalRequiredParams()
                );
            });
    }
}
