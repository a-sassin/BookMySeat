import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    DialogComponent,
    DialogProp,
} from 'src/app/common-component/dialog-component/dialog.component';
import { updateFloorMapPayload } from 'src/app/models/admin.model';
import {
    FloorData,
    FloorDetails,
    FloorInfo,
    FloorPlanRequestParams,
    FloorPlanResponse,
    Seat,
    SubordinateSeatsMapping,
} from 'src/app/models/booking-component.model';
import { AdminService } from 'src/app/services/admin.service';
import { BookingService } from 'src/app/services/booking.service';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { UserService } from 'src/app/services/user.service';
import {
    FACILITY_PRACTICES,
    FLOOR_MAPPING_BY_PRACTICE,
    MAX_DATE_BOOKING,
    PRACTICE_NAME_BY_FLOOR,
    RESPONSIBILTY_ASSIGN,
} from 'src/app/util/constants';
import { formatDate } from 'src/app/util/date-formats';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';

// jquery declaration
declare var $: any;

@Component({
    selector: 'app-manage-seat-booking',
    templateUrl: './manage-seat-booking.component.html',
    styleUrls: ['./manage-seat-booking.component.scss'],
})
export class ManageSeatBookingComponent implements OnInit, OnDestroy {
    selectedFloorPractice: string;
    selected = true;
    coordinates: Seat[] = [];
    seatMappings: SubordinateSeatsMapping[] = [];
    seatMappingMeta = [];
    isLoading = false;
    isBooking = false;
    submitted: boolean = false;
    bookingForm: FormGroup;
    todaysDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    maxDate = moment(this.todaysDate)
        .add(MAX_DATE_BOOKING, 'days')
        .format();
    floorInfo: FloorInfo;
    floorDataFound: boolean = true;
    selectedFloor: FloorDetails;
    facilityId: string;
    floorDetails: FloorDetails[];
    isBlocked: boolean = false;
    removable: boolean = true;
    superAdmin: boolean;
    isFacilityAdmin: boolean;
    seatsData: any = [];
    subordinates = new FormControl();
    private fromDate: string;
    private toDate: string;
    private areas = [];
    private floorData: FloorData;
    blockedSeats: any = [];
    unblockedSeats: any = [];
    seatStatus = ['available', 'blocked', 'booked'];
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    constructor(
        private formBuilder: FormBuilder,
        private bookingService: BookingService,
        private userService: UserService,
        private readonly snackBarService: SnackBarService,
        private readonly adminService: AdminService,
        public dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.superAdmin =
            this.userService?.getUserSessionData()?.isSuperAdmin ||
            JSON.stringify(FACILITY_PRACTICES) ===
                JSON.stringify(
                    this.userService?.getUserSessionData()?.assignedPractices
                );
        this.isFacilityAdmin = !!this.userService?.getUserSessionData()
            ?.assignedPractices.length;
        this.initFloorNo();
        this.initSeatBookingFrom();
        this.bookingForm.get('dateRange').patchValue(this.todaysDate);
        this.initFloorInfoState(0, 0, 0, 0);
        this.defaultFloorPractice();
    }

    isPracticeAvailabe(): boolean {
        const { roles, isSuperAdmin } = this.userService?.getUserSessionData();
        return isSuperAdmin || roles.includes(RESPONSIBILTY_ASSIGN[0])
            ? true
            : false;
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
    onRemoveSelectedSeat(seatDetails: FormGroup): void {
        $('img').mapster('set', true, seatDetails?.value?.seatId);
        let blockedSeats = this.blockedSeats;
        let unblockedSeats = this.unblockedSeats;

        const seatNo = seatDetails?.value?.seatNo;

        // removing seat from forms array
        const blockedSeatIndex = this.bookingForm.controls[
            'blockedSeats'
        ].value.findIndex((seat: { seatNo: any }) => seat.seatNo === seatNo);
        const unblockedSeatIndex = this.bookingForm.controls[
            'unblockedSeats'
        ].value.findIndex((seat: { seatNo: any }) => seat.seatNo === seatNo);

        // removing seat from image - mapping
        $('img').mapster('set', false, seatDetails?.value?.seatId);

        if (blockedSeatIndex >= 0) {
            blockedSeats.removeAt(blockedSeatIndex);
            this.colorSeats('remove_blocking', seatNo, 'ff0000');
            const seatData = this.seatFound(seatNo);
            seatData.status === 'available'
                ? this.colorSeats('blocking', seatNo, 'FFFFFF')
                : this.colorSeats('blocking', seatNo, 'ff0000');
        }
        if (unblockedSeatIndex >= 0) {
            unblockedSeats.removeAt(unblockedSeatIndex);
            this.colorSeats('remove_unblocking', seatNo, '616B73');
        }

        this.setSeatsData(seatNo);

        this.removeSeatFromMappingList(seatNo);
        // this.mapColours(true);
    }

    mapColours(showToolTip: Boolean): void {
        setTimeout(() => {
            $('img').mapster({
                showToolTip,
                toolTipContainer: `<div class="tooltip"></div>`,
                highlight: false,
                singleSelect: false,
                mapKey: 'alt',
                areas: this.areas,
            });
        }, 20);
    }

    onSeatSelect(coordinate: Seat): void {
        this.submitted = false;
        this.seatsData.push(coordinate);
        this.blockedSeats = this.bookingForm.get('blockedSeats') as FormArray;
        this.unblockedSeats = this.bookingForm.get(
            'unblockedSeats'
        ) as FormArray;

        if (coordinate.status === 'reserved' || this.isBlocked) {
            return;
        } else {
            const blockedSeatFound = this.blockedSeats.value?.some(
                el => el.seatId === coordinate.seatId
            );
            const unblockedSeatFound = this.unblockedSeats.value?.some(
                el => el.seatId === coordinate.seatId
            );
            if (
                !blockedSeatFound &&
                this.seatStatus.includes(coordinate.status)
            ) {
                $('img').mapster('set_options', {
                    isSelectable: true,
                });
                this.blockedSeats.push(
                    this.getSeatFormGroup(coordinate.seatNo, coordinate.seatId)
                );
                this.colorSeats('blocking', coordinate.seatNo, 'FC7A09');
            } else if (blockedSeatFound) {
                this.blockedSeats.removeAt(
                    this.blockedSeats.value.findIndex(
                        seat => seat.seatNo === coordinate.seatNo
                    )
                );
                this.removeSeatFromMappingList(coordinate.seatNo.toString());
                coordinate.status === 'available'
                    ? this.colorSeats('blocking', coordinate.seatNo, 'FFFFFF')
                    : this.colorSeats('blocking', coordinate.seatNo, 'ff0000');
                this.setSeatsData(coordinate.seatNo);
            } else if (
                !unblockedSeatFound &&
                coordinate.status === 'unavailable'
            ) {
                $('img').mapster('set_options', {
                    isSelectable: true,
                });
                this.unblockedSeats.push(
                    this.getSeatFormGroup(coordinate.seatNo, coordinate.seatId)
                );
                this.colorSeats('unblocking', coordinate.seatNo, '71F35');
            } else {
                this.unblockedSeats.removeAt(
                    this.unblockedSeats.value.findIndex(
                        seat => seat.seatNo === coordinate.seatNo
                    )
                );
                this.removeSeatFromMappingList(coordinate.seatNo.toString());
                this.colorSeats('unblocking', coordinate.seatNo, '616B73');
                this.setSeatsData(coordinate.seatNo);
            }
        }
    }

    private setSeatsData(seatNo: number): void {
        this.seatsData = this.seatsData.filter(seat => seat.seatNo !== seatNo);
    }

    getSeatFormGroup(seatNo: any, seatId: any): FormGroup {
        return this.formBuilder.group({
            seatNo: [seatNo],
            seatId: [seatId],
        });
    }

    submit(): void {
        this.submitted = true;
        if (
            this.blockedSeats.value.length === 0 &&
            this.unblockedSeats.value.length === 0
        ) {
            return;
        } else {
            const data: DialogProp = {
                id: 'manage-seats-confirmation-dialog',
                width: '550px',
                minHeight: '250px',
                panelClass: 'modelbox-styles',
                data: {
                    dialogType: 'confirmation',
                    title: `Confirmation Box`,
                    proceed: true,
                    message: `Are you sure you want to change the selected ${
                        (this.blockedSeats.value.length &&
                            this.unblockedSeats.value.length) ||
                        this.blockedSeats.value.length > 1 ||
                        this.unblockedSeats.value.length > 1
                            ? 'seats'
                            : 'seat'
                    } status?`,
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
            this.confirmDialog(data);
        }
    }

    private confirmDialog(data): void {
        const dialogRef = this.dialog.open(DialogComponent, data);

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.proceed === 'proceed') {
                this.updateFloorMap(this.bookingForm.value);
            }
        });
    }

    updateFloorMap(formData) {
        this.isBooking = true;
        const floorMapData: updateFloorMapPayload = {
            date: formatDate(formData.dateRange),
            facilityId: this.floorData.facilityId,
            floorNo: this.floorData.floorNo.toString(),
            seatsToBeChanged: this.seatsData.map(seat => {
                return {
                    seatNo: seat.seatNo.toString(),
                    status:
                        seat.status === 'unavailable'
                            ? 'available'
                            : 'unavailable',
                };
            }),
        };
        this.adminService
            .updateFloorMap(floorMapData)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                res => {
                    this.snackBarService.openSnackBar(res.message);
                    this.resetSelectedSeats();
                    this.initCoordinates(
                        formData.dateRange,
                        formData.dateRange
                    );
                    this.isBooking = false;
                },
                (error: HttpErrorResponse) => {
                    this.snackBarService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(error)
                    );
                    this.isBooking = false;
                }
            );
    }

    blockingSeatDateFormat(date: Date): string {
        return formatDate(date);
    }

    onFloorSelection(floorIndex: number): void {
        const {
            assignedPractices,
            practice,
        } = this.userService.getUserSessionData();
        this.floorDetails = FLOOR_MAPPING_BY_PRACTICE[practice];
        if (this.superAdmin) {
            this.floorDetails = FLOOR_MAPPING_BY_PRACTICE['SUPER_ADMIN_FLOORS'];
        } else if (this.isFacilityAdmin) {
            let floors: any = [];
            assignedPractices.forEach(practice => {
                FLOOR_MAPPING_BY_PRACTICE[practice].forEach(eachFloor =>
                    floors.push(eachFloor)
                );
            });
            this.floorDetails = floors;
        }
        if (this.floorDetails?.length < 2) {
            // no need to call floor map api for floors other than 4
            return;
        }
        if (floorIndex !== undefined && floorIndex !== null) {
            this.selectedFloor = this.floorDetails[floorIndex];

            if (
                !PRACTICE_NAME_BY_FLOOR[this.selectedFloorPractice].includes(
                    this.selectedFloor.floorNo
                )
            ) {
                this.defaultFloorPractice();
            }
            this.resetSelectedSeats();
            this.initCoordinates(this.fromDate, this.toDate);
        }
    }

    private defaultFloorPractice() {
        for (const practice in PRACTICE_NAME_BY_FLOOR) {
            if (
                PRACTICE_NAME_BY_FLOOR[practice].includes(
                    this.selectedFloor.floorNo
                )
            ) {
                this.selectedFloorPractice = practice;
            }
        }
    }

    validateMappings(
        control: AbstractControl
    ): { [key: string]: boolean } | null {
        if (this.bookingForm?.controls?.seats?.value?.length > 1) {
            if (!control.value || control.value === '') {
                return { required: true };
            } else return null;
        }
        return null;
    }

    private removeSeatFromMappingList(value: string): void {
        this.seatMappings = this.seatMappings.filter(
            item => item.seatNo !== value
        );
        this.seatMappingMeta = this.seatMappingMeta.filter(
            item => item.seatNo !== value
        );
    }

    private initFloorNo(): void {
        const {
            practice = '',
            assignedPractices,
        } = this.userService.getUserSessionData();

        this.floorDetails = FLOOR_MAPPING_BY_PRACTICE[practice];
        if (this.superAdmin) {
            this.floorDetails = FLOOR_MAPPING_BY_PRACTICE['SUPER_ADMIN_FLOORS'];
        } else if (this.isFacilityAdmin) {
            let floors: any = [];
            assignedPractices.forEach(practice => {
                FLOOR_MAPPING_BY_PRACTICE[practice].forEach(eachFloor =>
                    floors.push(eachFloor)
                );
            });
            this.floorDetails = floors;
        }
        if (this.floorDetails) {
            this.selectedFloor = this.floorDetails[0];
        }
    }

    private initCoordinates(fromDate: string, todate: string): void {
        const params: FloorPlanRequestParams = {
            floorNo: this.selectedFloor?.floorNo,
            facilityId: this.selectedFloor?.facilityId,
            fromDate: formatDate(fromDate),
            toDate: formatDate(todate),
        };
        this.isLoading = true;
        forkJoin([this.bookingService.getFloorPlan(params)])
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: FloorPlanResponse[]) => {
                    this.floorData = res[0]['data'];
                    this.coordinates = (
                        res[0]?.data?.listingData[0]?.seats || []
                    ).filter(
                        seat =>
                            !seat.socialDistancingEnabled ||
                            seat.socialDistancingEnabled
                    );
                    let {
                        totalSeatsCount = 0,
                        availableSeatsCount = 0,
                        blockedSeatsCount = 0,
                        bookedSeatsCount = 0,
                    } = this.floorData?.listingData[0];
                    //fun for coloring blocked, available, reserved areas
                    this.areas = [];
                    this.colorAreas(this.coordinates);
                    this.mapColours(true);
                    //fun for no total, available, booked seats
                    this.initFloorInfoState(
                        totalSeatsCount,
                        availableSeatsCount,
                        blockedSeatsCount,
                        bookedSeatsCount
                    );
                    this.isLoading = false;
                },
                (error: HttpErrorResponse) => {
                    if (error.status !== 401) {
                        this.snackBarService.openSnackBar(
                            ErrorMessageUtil.getErrorMessage(error)
                        );
                    }
                    this.floorDataFound = false;
                    this.isLoading = false;
                }
            );
    }

    private initSeatBookingFrom(): void {
        this.bookingForm = this.formBuilder.group({
            dateRange: [null, [Validators.required]],
            blockedSeats: this.formBuilder.array([], Validators.required),
            unblockedSeats: this.formBuilder.array([], Validators.required),
        });
        if (this.isPracticeAvailabe()) {
            this.bookingForm
                .get('dateRange')
                .valueChanges.pipe(takeUntil(this.ngUnsubscribe))
                .subscribe(bookingDate => {
                    this.fromDate = bookingDate;
                    this.toDate = bookingDate;
                    this.setCoordinates();
                });
        } else {
            this.bookingForm.disable();
        }
    }
    private setCoordinates() {
        this.initCoordinates(this.fromDate, this.toDate);
        this.resetSelectedSeats();
    }

    private resetSelectedSeats(): void {
        let seatsArray = this.bookingForm.get('blockedSeats') as FormArray;
        seatsArray.clear();
        seatsArray = this.bookingForm.get('unblockedSeats') as FormArray;
        seatsArray.clear();
        this.seatsData.splice(0, this.seatsData.length);
        this.bookingForm.controls?.blockedSeats?.reset();
        this.bookingForm.controls?.unblockedSeats?.reset();
        this.seatMappings.splice(0, this.seatMappings?.length);
        this.seatMappingMeta.splice(0, this.seatMappingMeta?.length);
        this.floorDataFound = true;
        this.isBlocked = false;
        this.submitted = false;
    }

    private initFloorInfoState(
        totalSeats: number,
        available: number,
        blockedSeats: number,
        bookedSeats: number
    ): void {
        this.floorInfo = {
            totalSeats,
            available,
            occupied: bookedSeats + blockedSeats,
            blocked: totalSeats - available - bookedSeats - blockedSeats,
        };
    }

    private colorAreas(coordinates: Seat[]): void {
        for (let i of coordinates) {
            if (i.status === 'blocked' || i.status === 'booked') {
                this.areas.push({
                    key: i.seatId,
                    staticState: true,
                    highlight: true,
                    toolTip: `<div>
                      <div>Seat No. ${i.seatNo}</div>
                      <div>Occupied By: ${i.bookedForName}</div>
                    </div>`,
                    render_select: {
                        fillColor: 'ff0000',
                        stroke: false,
                    },
                    render_highlight: {
                        fillColor: '000000',
                        stroke: false,
                    },
                });
            } else if (i.status === 'unavailable' || this.isBlocked) {
                this.areas.push({
                    key: i.seatId,
                    staticState: true,
                    highlight: true,
                    toolTip: `<div>
                    <div>Seat No. ${i.seatNo}</div>
                    <div>Seat blocked</div>
                  </div>`,
                    render_select: {
                        fillColor: '616B73',
                        stroke: false,
                    },
                    render_highlight: {
                        fillColor: '71F351',
                        stroke: false,
                    },
                });
            } else if (i.status === 'reserved' || this.isBlocked) {
                this.areas.push({
                    key: i.seatId,
                    staticState: true,
                    highlight: false,
                    toolTip: `<div>
                      <div>Seat No. ${i.seatNo}</div>
                      <div>Seat reserved permanently for marketing team</div>
                    </div>`,
                    render_select: {
                        fillColor: '616B73',
                        stroke: false,
                    },
                });
            } else {
                this.areas.push({
                    key: i.seatId,
                    highlight: true,
                    toolTip: `<div>
                    <div>Seat No. ${i.seatNo}</div>
                    <div>Seat Available</div>
                  </div>`,
                    render_select: {
                        fillColor: 'FC7A09',
                        stroke: false,
                    },
                    render_highlight: {
                        fillColor: 'FC7A09',
                        stroke: false,
                    },
                });
            }
        }
    }

    private colorSeats(updatedStatus, seatNo, render_select_color) {
        if (updatedStatus === 'unblocking') {
            const seatData = this.seatFound(seatNo);
            if (seatData.status === 'unavailable') {
                this.chnageColor(seatData, render_select_color);
            }
        } else if (updatedStatus === 'blocking') {
            const seatData = this.seatFound(seatNo);
            if (this.seatStatus.includes(seatData.status)) {
                this.chnageColor(seatData, render_select_color);
            }
        } else if (updatedStatus === 'remove_unblocking') {
            const seatData = this.seatFound(seatNo);
            if (seatData.status === 'unavailable') {
                this.chnageColor(seatData, render_select_color);
            }
        } else if (updatedStatus === 'remove_blocking') {
            const seatData = this.seatFound(seatNo);
            if (this.seatStatus.includes(seatData.status)) {
                this.chnageColor(seatData, render_select_color);
            }
        }
        this.mapColours(true);
    }

    private seatFound(seatNo: any) {
        return this.seatsData.find(seat => seat.seatNo === seatNo);
    }

    private chnageColor(seat: any, render_select_color) {
        const index = this.areas.findIndex(coord => coord.key === seat.seatId);
        if (index >= 0) {
            this.areas[index].render_select = {
                fillColor: render_select_color,
                stroke: false,
            };
            this.areas[index].render_highlight = {
                fillColor: render_select_color,
                stroke: false,
            };
            if (seat.status === 'available') {
                this.areas[index].staticState = true;
            }
        }
    }
}

export interface FormData {
    seats: { seatNo: any; seatId: any }[];
    dateRange: moment.MomentInput;
}
