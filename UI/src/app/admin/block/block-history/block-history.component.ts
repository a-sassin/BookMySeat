import { Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import {
    FilterOptions,
    ResetFilterEvent,
    TableProperties,
} from 'src/app/models/table-component.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { TablePaginationModel } from 'src/app/common-component/table-component/table.component';
import { PageEvent } from '@angular/material/paginator';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import {
    BlockFacilityActionClickedEvent,
    BlockFacilityPayload,
    BlockFacilityResponse,
    BlockHistoryListItem,
    BlockHistoryParams,
    BlockHistoryResponse,
    EditBlockFacilityParams,
} from 'src/app/models/block-facility.model';
import { BlockService } from 'src/app/services/block.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';
import { BlockFacilityComponent } from '../block-facility/block-facility.component';
import {
    INDEFINITE_DATE,
    SEREVR_INDEFINITE_DATE,
} from 'src/app/util/constants';
import { facilityWiseName } from '../block-facility/facility-details';
import { formatDate } from 'src/app/util/date-formats';
import {
    DialogComponent,
    DialogProp,
} from 'src/app/common-component/dialog-component/dialog.component';
@Component({
    selector: 'app-block-history',
    templateUrl: './block-history.component.html',
    styleUrls: ['./block-history.component.scss'],
})
export class BlockHistoryComponent implements OnInit, OnDestroy {
    displayedColumns: string[] = [
        'requestId',
        'fromDate',
        'toDate',
        'building',
        'floors',
        'reason',
        'blockedBy',
        'actions',
    ];
    blockingHistoryList: BlockHistoryListItem[] = [];
    paginationModel: TablePaginationModel = new TablePaginationModel();
    tableLoader = false;
    masterTableFields: TableProperties[] = [
        {
            fieldName: 'requestId',
            headerName: 'Request ID',
            cellContent: 'text',
        },
        {
            fieldName: 'fromDate',
            headerName: 'From Date',
            cellContent: 'text',
        },
        {
            fieldName: 'toDate',
            headerName: 'To Date',
            cellContent: 'text',
        },
        {
            fieldName: 'building',
            headerName: 'Building',
            cellContent: 'number',
        },
        {
            fieldName: 'floors',
            headerName: 'Floors',
            cellContent: 'number',
        },
        {
            fieldName: 'reason',
            headerName: 'Reason of Blocking',
            cellContent: 'text',
        },
        {
            fieldName: 'blockedBy',
            headerName: 'Blocked by',
            cellContent: 'text',
        },
        {
            fieldName: 'actions',
            headerName: 'Actions',
            cellContent: 'button',
            buttonProperties: [
                {
                    value: 'cancel',
                    buttonText: 'Unblock',
                    style: 'display: flex;justify-content:center',
                    disableButton: true,
                },
                {
                    value: 'edit',
                    buttonText: 'Edit',
                    color: 'primary',
                    style:
                        'width:75px;margin-left: 1rem;display: flex;justify-content:center',
                    disableButton: true,
                },
            ],
        },
    ];

    todaysDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    minDate = moment()
        .subtract(3, 'M')
        .toISOString();
    maxDate = moment(this.todaysDate)
        .add(29, 'days')
        .format();
    filterOptions: FilterOptions[] = [
        {
            label: 'Enter Date',
            inputType: 'date-picker',
            minDate: this.minDate,
            maxDate: this.maxDate,
        },
    ];
    filterDate: string = null;
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    constructor(
        public dialog: MatDialog,
        private readonly blockService: BlockService,
        private readonly showNotification: SnackBarService
    ) {}

    ngOnInit(): void {
        this.getBlockHistory(this.getBlockHistoryRequiredParams());
    }
    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
    onPaginationChange($event: PageEvent): void {
        const { pageIndex, pageSize } = $event;
        this.paginationModel.pageIndex = pageIndex;
        this.paginationModel.pageSize = pageSize;
        const params: BlockHistoryParams = this.getBlockHistoryRequiredParams();
        if (this.filterDate) {
            // Take filter data here and apply filter
            params.date = this.filterDate;
        }

        // Add blocking history list api here
        this.getBlockHistory(params);
    }

    onDateFilterChange($event: MatDatepickerInputEvent<Date>): void {
        const { value } = $event;
        this.filterDate = value ? value.toISOString() : null;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        const param: BlockHistoryParams = {
            ...this.getBlockHistoryRequiredParams(),
        };
        if (this.filterDate) {
            param.date = formatDate(this.filterDate);
        }
        this.getBlockHistory(param);
    }

    onResetClick($event: ResetFilterEvent): void {
        this.filterDate = null;
        const { value } = $event;
        // goto firstpage after filter applied
        this.paginationModel.pageIndex = 0;
        if (value === 'reset') {
            this.getBlockHistory(this.getBlockHistoryRequiredParams());
        }
    }
    // unblock and edit
    onButtonClicked(buttonEvent: BlockFacilityActionClickedEvent): void {
        const rowData: BlockHistoryListItem = buttonEvent && buttonEvent.row;
        const action = (buttonEvent.buttonClicked || '').toLocaleLowerCase();
        if (action === 'edit') {
            this.openDialog(rowData);
        } else {
            const data: DialogProp = {
                id: 'unblock-facility-dialog',
                width: '550px',
                minHeight: '250px',
                panelClass: 'modelbox-styles',
                data: {
                    dialogType: 'confirmation',
                    title: `Request ID ${rowData?.id}`,
                    proceed: true,
                    message: `Are you sure you want to unblock the ${
                        rowData?.floors?.length > 1 ? 'floors' : 'floor'
                    } <b>${rowData?.floors}</b> for the facility <b>${
                        rowData?.building
                    }</b>?`,
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
            this.confirmDialog(rowData, data);
        }
    }

    private openDialog(rowInfo: BlockHistoryListItem): void {
        const dialogRef = this.dialog.open(BlockFacilityComponent, {
            disableClose: true,
            autoFocus: false,
            panelClass: 'edit-dialogbox-styles',
            data: rowInfo,
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result === 'save') {
                this.getBlockHistory(this.getBlockHistoryRequiredParams());
            }
        });
    }

    private confirmDialog(rowInfo, data): void {
        const dialogRef = this.dialog.open(DialogComponent, data);

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.proceed === 'proceed') {
                this.cancelRequest(rowInfo);
            }
        });
    }

    private cancelRequest(rowInfo: BlockHistoryListItem): void {
        this.tableLoader = true;
        const reqId: EditBlockFacilityParams = { id: rowInfo.id };
        const unblockdata: BlockFacilityPayload = {
            data: {
                facilityId: Object.keys(facilityWiseName).find(
                    facilityNameIndex =>
                        facilityWiseName[facilityNameIndex] === rowInfo.building
                ),
                floors: rowInfo.floors,
            },
            fromDate: formatDate(rowInfo.fromDate),
            toDate:
                rowInfo.toDate === 'Not decided'
                    ? INDEFINITE_DATE
                    : formatDate(rowInfo.toDate),
        };
        this.blockService
            .unblockFacility(unblockdata, reqId)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BlockFacilityResponse) => {
                    this.tableLoader = false;
                    this.showNotification.openSnackBar(res?.data?.message);
                    this.getBlockHistory(this.getBlockHistoryRequiredParams());
                },
                (_error: HttpErrorResponse) => {
                    this.tableLoader = false;
                    this.showNotification.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                    this.getBlockHistory(this.getBlockHistoryRequiredParams());
                }
            );
    }

    private getBlockHistory(params?: BlockHistoryParams): void {
        this.tableLoader = true;
        this.blockService
            .getBlockHistory(params)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BlockHistoryResponse) => {
                    this.tableLoader = false;
                    const blockHistoryData = res?.data || [];
                    this.blockingHistoryList = blockHistoryData.map(
                        history => ({
                            requestId: history?.id,
                            fromDate: moment(history.fromDate).format('LL'),
                            toDate:
                                history.toDate === SEREVR_INDEFINITE_DATE
                                    ? 'Not decided'
                                    : moment(history.toDate).format('LL'),
                            reason: history.reason,
                            id: history.id,
                            building:
                                facilityWiseName[history?.facility?.facilityId],
                            floors: history?.facility?.floors,
                            blockedBy: history.blockedBy?.toUpperCase(),
                            blockedByName: history.blockedByName,
                            buttonStatus:
                                history?.toDate !== SEREVR_INDEFINITE_DATE &&
                                moment(history?.toDate).isBefore(
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
                    this.showNotification.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private getBlockHistoryRequiredParams(): BlockHistoryParams {
        const { pageIndex, pageSize } = this.paginationModel;
        return {
            orderBy: 'fromDate',
            sortOrder: 'desc',
            offset: String(pageIndex * pageSize ?? 0),
            limit: String(pageSize),
        };
    }
}
