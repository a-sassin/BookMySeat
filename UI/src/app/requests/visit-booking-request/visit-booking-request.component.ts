import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    ActionClickedEvent,
    BookingActionResponse,
    BookingActionPayload,
    PendingApprovalsParams,
    VisitPendingApprovalListItem,
    VisitPendingApprovalResponse,
} from 'src/app/models/pending-approval-component.model';
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
import {
    ANONYMOUS_ERROR,
    INVALID_REJECTION_REMARK,
    MAX_DATE_BOOKING,
    NO_REASON,
    RESPONSIBILTY_ASSIGN,
    SOCKET_EVENTS,
    VACCINATION_STATUS,
} from 'src/app/util/constants';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { formatDate } from 'src/app/util/date-formats';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';
import { WebSocketService } from 'src/app/services/web-socket.service';
@Component({
    selector: 'app-visit-booking-request',
    templateUrl: './visit-booking-request.component.html',
    styleUrls: ['./visit-booking-request.component.scss'],
})
export class VisitBookingRequestComponent implements OnInit, OnDestroy {
    visitPendingApprovalList: VisitPendingApprovalListItem[] = [];
    tableLoader = false;
    paginationModel: TablePaginationModel = new TablePaginationModel();
    displayedColumns: string[] = [
        'requestId',
        'employeeId',
        'date',
        'category',
        'concernedEmployee',
        'reason',
        'actions',
    ];
    masterTableFields: TableProperties[] = [
        {
            fieldName: 'requestId',
            headerName: 'Request ID',
            cellContent: 'text',
        },
        {
            fieldName: 'employeeId',
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
            fieldName: 'bookedBy',
            headerName: 'Booked By',
            cellContent: 'text',
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
                { value: 'approve', buttonText: 'Approve', color: 'primary' },
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

    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    constructor(
        private readonly bookingService: BookingService,
        private readonly userService: UserService,
        public dialog: MatDialog,
        private readonly snackBarService: SnackBarService,
        private readonly wsService: WebSocketService
    ) {}
    screenWidth: any;

    ngOnInit(): void {
        this.listenForNotifications();
        this.getVisitPendingApprovals(this.getVisitPendingApprovalsParams());
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
            this.displayedColumns = ['requestId', 'employeeId', 'iconAction'];
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
        const params: PendingApprovalsParams = this.getVisitPendingApprovalsParams();
        if (this.filterDate) {
            params.date = this.filterDate;
        }
        this.getVisitPendingApprovals(params);
    }

    onDateFilterChange($event: MatDatepickerInputEvent<Date>): void {
        const { value } = $event;
        this.filterDate = value ? formatDate(value) : null;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        const param: PendingApprovalsParams = {
            ...this.getVisitPendingApprovalsParams(),
        };
        if (this.filterDate) {
            param.date = this.filterDate;
        }
        this.getVisitPendingApprovals(param);
    }

    onResetClick($event: ResetFilterEvent): void {
        this.filterDate = null;
        const { value } = $event;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        if (value === 'reset') {
            this.getVisitPendingApprovals(
                this.getVisitPendingApprovalsParams()
            );
        }
    }

    private getVisitPendingApprovalsParams(): PendingApprovalsParams {
        const { pageIndex, pageSize } = this.paginationModel;
        const { empId } = this.userService.getUserSessionData();
        return {
            approverId: empId,
            offset: String(pageIndex * pageSize ?? 0),
            limit: String(pageSize),
            orderBy: 'date',
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
        const rejectPayload: BookingActionPayload = {
            requestId,
            action: isApproved ? 'approved' : 'rejected',
            rejectionReason: actionNote,
        };
        if (isApproved) {
            delete rejectPayload.rejectionReason;
        }
        const roles = RESPONSIBILTY_ASSIGN[1];
        this.bookingService
            .actionOnVisitBookingRequest(rejectPayload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BookingActionResponse) => {
                    this.wsService.emit(SOCKET_EVENTS.ACTIONED, {
                        practice,
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
                        ...this.getVisitPendingApprovalsParams(),
                    };
                    // for fetching list accordingly if current date filter is applied on ui
                    if (this.filterDate) {
                        params.date = this.filterDate;
                    }
                    this.getVisitPendingApprovals(params);
                },
                (_error: any) => {
                    this.tableLoader = false;
                    this.snackBarService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private getVisitPendingApprovals(params: PendingApprovalsParams): void {
        this.tableLoader = true;
        this.bookingService
            .getVisitPendingApprovals(params)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: VisitPendingApprovalResponse) => {
                    this.tableLoader = false;
                    const pendingApprovalData = res?.data;
                    this.visitPendingApprovalList = pendingApprovalData.map(
                        request => ({
                            employeeId: request.empId.toUpperCase(),
                            dynamicStyles: request.vaccinationStatus
                                ? VACCINATION_STATUS.vaccinatedStyle
                                : VACCINATION_STATUS.notVaccinatedStyle,
                            bookedByName: request.bookedByName,
                            requestId: request?.requestId,
                            date: moment(request?.date).format('LL'),
                            category: request.category,
                            concernedEmployee: request.concernedEmpName,
                            reason: request.requestSummary
                                ? request.requestSummary
                                : NO_REASON,
                            practice: request?.practice,
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

    //  Fetching latest data on self route
    private listenForNotifications(): void {
        this.userService.notficationReceived
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => {
                this.getVisitPendingApprovals(
                    this.getVisitPendingApprovalsParams()
                );
            });
    }
}
