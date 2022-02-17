import { HttpErrorResponse } from '@angular/common/http';
import { Inject, Optional } from '@angular/core';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    FormGroupDirective,
    Validators,
} from '@angular/forms';
import {
    MatDialog,
    MatDialogRef,
    MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    DialogComponent,
    DialogProp,
} from 'src/app/common-component/dialog-component/dialog.component';
import {
    EditBlockFacilityParams,
    BlockFacilityPayload,
    BlockFacilityResponse,
    BlockHistoryListItem,
} from 'src/app/models/block-facility.model';
import { BlockService } from 'src/app/services/block.service';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { FACILITY_MAPPING, INDEFINITE_DATE } from 'src/app/util/constants';
import { formatDate } from 'src/app/util/date-formats';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';
import {
    facilityList,
    FacilityListModel,
    facilityWiseName,
    Floor,
} from './facility-details';
@Component({
    selector: 'app-block-facility',
    templateUrl: './block-facility.component.html',
    styleUrls: ['./block-facility.component.scss'],
})
export class BlockFacilityComponent implements OnInit, OnDestroy {
    blockFacilityForm: FormGroup;
    todaysDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    maxDate = moment()
        .add(29, 'days')
        .format();
    floors: Floor[] = [];
    errorMessage = '';
    loading = false;
    isIndefinite = true;
    facilityList: FacilityListModel[] = facilityList;

    @ViewChild(FormGroupDirective) form: FormGroupDirective;
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    constructor(
        @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
        @Optional() public dialogRef: MatDialogRef<BlockFacilityComponent>,
        public dialog: MatDialog,
        private readonly fb: FormBuilder,
        private readonly blockService: BlockService,
        private readonly showNotification: SnackBarService
    ) {}
    ngOnInit(): void {
        this.initCancellationForm();
        this.checkForm();
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    onFormSubmit(): void {
        if (this.isIndefinite === true && this.blockFacilityForm.valid) {
            const receivedFormData = this.blockFacilityForm.value;
            this.showConfirmationBox(receivedFormData);
        } else {
            if (this.blockFacilityForm.valid) {
                const receivedFormData = this.blockFacilityForm.value;
                this.showConfirmationBox(receivedFormData);
            }
        }
    }

    private showConfirmationBox(rowData): void {
        const data: DialogProp = {
            id: 'block-facility-dialog',
            width: '550px',
            minHeight: '250px',
            panelClass: 'modelbox-styles',
            data: {
                dialogType: 'confirmation',
                title: `Block Facility Confirmation`,
                proceed: true,
                message: `Are you sure you want to block the ${
                    rowData?.floors?.length > 1 ? 'floors' : 'floor'
                } <b>${rowData?.floors}</b> for the facility <b>${
                    FACILITY_MAPPING[rowData?.facility.toUpperCase()]
                }</b>?`,
                warningMessage: this.getStringMessages(rowData),
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

    private confirmDialog(rowInfo, data): void {
        const dialogRef = this.dialog.open(DialogComponent, data);

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.proceed === 'proceed') {
                rowInfo.dateRange
                    ? this.blockFacility(this.initBlockFacilityPayload(rowInfo))
                    : this.blockFacility(
                          this.initBlockFacilityPayloadForIndefinite(rowInfo)
                      );
            }
        });
    }

    private getStringMessages(rowdata): string {
        if (rowdata.dateRange) {
            return `This will cancel all the bookings ${
                moment(rowdata.dateRange['start']).isSame(
                    moment(rowdata.dateRange['end'])
                )
                    ? `for ${moment(rowdata.dateRange['start']).format(
                          'MMM D'
                      )}`
                    : `from ${moment(rowdata.dateRange['start']).format(
                          'MMM D'
                      )} - ${moment(rowdata.dateRange['end']).format('MMM D')}`
            } (if any).`;
        } else {
            return `This will cancel all the bookings from ${moment(
                rowdata.fromDate
            ).format('MMM D')} - till further notice (if any).`;
        }
    }

    onResetForm(): void {
        this.floors = [];
        this.form.resetForm();
        this.isIndefinite
            ? this.blockFacilityForm.get('dateRange').markAsUntouched()
            : this.blockFacilityForm.get('fromDate').markAsUntouched();
    }

    onEditForm(): void {
        this.blockFacilityForm.value.facility = Object.keys(
            facilityWiseName
        ).find(
            facilityNameIndex =>
                facilityWiseName[facilityNameIndex] ===
                this.blockFacilityForm.value.facility
        );
        if (this.isIndefinite && this.blockFacilityForm.valid) {
            const receivedFormData = this.blockFacilityForm.value;
            this.editBlockFacility(
                { id: this.data?.id },
                this.initBlockFacilityPayload(receivedFormData)
            );
        } else {
            if (this.blockFacilityForm.valid) {
                const receivedFormData = this.blockFacilityForm.value;
                this.editBlockFacility(
                    { id: this.data?.id },
                    this.initBlockFacilityPayloadForIndefinite(receivedFormData)
                );
            }
        }
    }

    onFacilityChange(event): void {
        const selectedFacility = event?.value;
        const dropDownData = this.facilityList.find(
            (data: any) => data.facilityID === selectedFacility
        );
        if (dropDownData) {
            this.floors = dropDownData.floors;
        } else {
            this.floors = [];
        }
    }

    private checkForm(): void {
        if (this.data) {
            this.facilityList.forEach(result => {
                if (result.facilityName === this.data?.building) {
                    this.floors = result.floors;
                }
            });
            this.setFormValue(this.data);
        }
    }

    private initCancellationForm(): void {
        if (this.isIndefinite) {
            this.blockFacilityForm = this.fb.group({
                dateRange: this.fb.group({
                    start: [null, Validators.required],
                    end: [null, Validators.required],
                }),
                facility: [null, Validators.required],
                floors: [null, Validators.required],
                reason: [null, Validators.required],
            });
        } else {
            this.blockFacilityForm = this.fb.group({
                fromDate: [null, Validators.required],
                facility: [null, Validators.required],
                floors: [null, Validators.required],
                reason: [null, Validators.required],
            });
        }
    }

    dateRangeRadio(): void {
        this.isIndefinite = true;
        this.floors = [];
        this.initCancellationForm();
        this.checkForm();
        this.data ? '' : this.onResetForm();
    }
    IndefiniteRadio(): void {
        this.isIndefinite = false;
        this.floors = [];
        this.initCancellationForm();
        this.checkForm();
        this.data ? '' : this.onResetForm();
    }

    private setFormValue(rowdata: BlockHistoryListItem): void {
        if (this.isIndefinite) {
            this.blockFacilityForm.setValue({
                dateRange: {
                    start: new Date(rowdata?.fromDate),
                    end: new Date(rowdata?.toDate),
                },
                facility: rowdata?.building,
                floors: rowdata?.floors,
                reason: rowdata?.reason,
            });
        } else {
            this.blockFacilityForm.setValue({
                fromDate: new Date(rowdata?.fromDate),
                facility: rowdata?.building,
                floors: rowdata?.floors,
                reason: rowdata?.reason,
            });
        }
    }
    private blockFacility(blockFacilityPayload: BlockFacilityPayload): void {
        this.loading = true;
        this.blockService
            .blockFacility(blockFacilityPayload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BlockFacilityResponse) => {
                    this.showNotification.openSnackBar(res?.data?.message);
                    this.loading = false;
                    this.onResetForm();
                },
                (_error: HttpErrorResponse) => {
                    this.loading = false;
                    this.showNotification.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }
    private editBlockFacility(
        reqId: EditBlockFacilityParams,
        editBlockFacilityPayload: BlockFacilityPayload
    ): void {
        this.loading = true;
        this.blockService
            .editBlockFacility(reqId, editBlockFacilityPayload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BlockFacilityResponse) => {
                    this.showNotification.openSnackBar(res?.data?.message);
                    this.loading = false;
                    this.dialogRef.close('save');
                    this.onResetForm();
                },
                (_error: HttpErrorResponse) => {
                    this.loading = false;
                    this.showNotification.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private initBlockFacilityPayload(
        data: BlockFacilityFormData
    ): BlockFacilityPayload {
        const facilityDetails = {
            facilityId: data.facility,
            floors: data.floors,
        };
        return {
            fromDate: formatDate(data?.dateRange?.start),
            toDate: formatDate(data?.dateRange?.end),
            data: facilityDetails,
            rejectionReason: data.reason,
        };
    }

    private initBlockFacilityPayloadForIndefinite(
        data: BlockFacilityFormData
    ): BlockFacilityPayload {
        const facilityDetails = {
            facilityId: data.facility,
            floors: data.floors,
        };
        return {
            fromDate: formatDate(data?.fromDate),
            toDate: INDEFINITE_DATE,
            data: facilityDetails,
            rejectionReason: data.reason,
        };
    }
}

export interface BlockFacilityFormData {
    dateRange?: DateRangeData;
    fromDate?: string;
    facility: string;
    floors: string[];
    reason: string;
}

export interface DateRangeData {
    start: string;
    end: string;
}
