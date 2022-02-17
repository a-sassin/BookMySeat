import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    Validators,
    FormArray,
    FormControl,
    AbstractControl,
} from '@angular/forms';
import { BookingService } from '../services/booking.service';
import { forkJoin, Observable, Subject } from 'rxjs';
import {
    BookSeatRequestPayload,
    BookSeatResponse,
    FloorData,
    FloorDetails,
    FloorInfo,
    FloorPlanRequestParams,
    FloorPlanResponse,
    Seat,
    SubordinateSeatsMapping,
} from '../models/booking-component.model';
import * as moment from 'moment';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import {
    MAT_MOMENT_DATE_FORMATS,
    MomentDateAdapter,
} from '@angular/material-moment-adapter';
import {
    DateAdapter,
    MatOptionSelectionChange,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';
import { HttpErrorResponse } from '@angular/common/http';
import { map, startWith, takeUntil } from 'rxjs/operators';
import {
    EXTRA_FACILITY_PRACTICES,
    FLOOR_MAPPING_BY_PRACTICE,
    MAX_DATE_BOOKING,
    PRACTICE_NAME_BY_FLOOR,
    RESPONSIBILTY_ASSIGN,
    SOCKET_EVENTS,
} from '../util/constants';
import { WebSocketService } from '../services/web-socket.service';
import {
    ErrorMessageUtil,
    noWhitespaceValidator,
} from '../util/error-msg-util';
import { SnackBarService } from '../services/snackbar.service';
import { MatSelect } from '@angular/material/select';
import { ApprovalLevel } from '../models/role';
import { formatDate } from '../util/date-formats';
import { AdminService } from '../services/admin.service';
import { EmployeeList } from '../models/admin.model';

// jquery declaration
declare var $: any;
@Component({
    selector: 'app-booking',
    templateUrl: './booking.component.html',
    styleUrls: ['./booking.component.scss'],
    providers: [
        {
            provide: DateAdapter,
            useClass: MomentDateAdapter,
            deps: [MAT_DATE_LOCALE],
        },
        { provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS },
    ],
})
export class BookingComponent implements OnInit, OnDestroy {
    @ViewChild('subordinatesSelectionBox')
    private subordinatesSelectionBox: MatSelect;
    @ViewChild('employeesSelectionBox')
    private employeesSelectionBox: MatSelect;

    selectFormControl = new FormControl();
    searchTextboxControl = new FormControl();
    selectedValues = [];
    employees: EmployeeList[] = [{ name: '', empId: '' }];
    selectedFloorPractice: string;
    filteredOptions: Observable<any[]>;
    selected = true;
    coordinates: Seat[] = [];
    seatMappings: SubordinateSeatsMapping[] = [];
    seatMappingMeta = []; // empID, seatNo
    subordinateSeatMapping: SubordinateSeatsMapping[] = []; // contains sub list
    isLoading = false;
    isBooking = false;
    submitted: boolean = false;
    bookingForm: FormGroup;
    endDate: any;
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
    subordinates = new FormControl();
    private fromDate: string;
    private toDate: string;
    private areas = [];
    private floorData: FloorData;
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    constructor(
        private formBuilder: FormBuilder,
        private bookingService: BookingService,
        private userService: UserService,
        private router: Router,
        private readonly wsService: WebSocketService,
        private readonly snackBarService: SnackBarService,
        private readonly adminService: AdminService
    ) {}

    ngOnInit(): void {
        const {
            isSuperAdmin,
            assignedPractices,
            roles,
        } = this.userService?.getUserSessionData();
        this.superAdmin = isSuperAdmin;
        this.isFacilityAdmin =
            !!assignedPractices?.length &&
            roles.includes(RESPONSIBILTY_ASSIGN[0]);
        this.initFloorNo();
        this.initSeatBookingFrom();
        this.initFloorInfoState(0, 0, 0, 0);
        this.defaultFloorPractice();
        // Set filter event based on value changes
        this.filteredOption();
    }

    // Set filter event based on value changes
    filteredOption() {
        this.filteredOptions = null;
        this.filteredOptions = this.searchTextboxControl.valueChanges.pipe(
            startWith<string>(''),
            map(name => this._filter(name))
        );
    }

    // Used to filter data based on search input
    private _filter(name: string): EmployeeList[] {
        const filterValue = name.toLowerCase();
        // Set selected values to retain the selected checkbox state
        this.setSelectedValues();

        this.selectFormControl.patchValue(
            this.selectedValues.length ? this.selectedValues : []
        );

        let filteredList = this.employees.filter(
            option => option.name.toLowerCase().indexOf(filterValue) === 0
        );
        return filteredList;
    }

    // Remove from selected values based on uncheck
    selectionChange(event) {
        if (event.isUserInput && event.source.selected == false) {
            let index = this.selectedValues.indexOf(event.source.value);
            this.selectedValues.splice(index, 1);
        }
    }

    openedChange(e) {
        // Set search textbox value as empty while opening selectbox
        this.searchTextboxControl.patchValue('');
    }

    // Clearing search textbox value
    clearSearch(event) {
        event.stopPropagation();
        this.searchTextboxControl.patchValue('');
    }

    // Set selected values to retain the state
    setSelectedValues() {
        if (
            this.selectFormControl.value &&
            this.selectFormControl.value.length > 0
        ) {
            this.selectFormControl.value.forEach(e => {
                if (this.selectedValues.indexOf(e) === -1) {
                    this.selectedValues.push(e);
                }
            });
        }
    }

    getEmployeesList(sendPractice) {
        const {
            empName,
            empId,
            practice,
            isSuperAdmin,
        } = this.userService.getUserSessionData();
        const searchDetails = {
            practices: [sendPractice, EXTRA_FACILITY_PRACTICES],
            limit: 1000,
        };
        this.adminService.getEmployees(searchDetails).subscribe(
            res => {
                this.employees = res.data;
                if (
                    practice === sendPractice ||
                    isSuperAdmin ||
                    EXTRA_FACILITY_PRACTICES.includes(practice)
                ) {
                    this.employees.forEach(element => {
                        if (element.empId === empId) {
                            const index = this.employees.indexOf(element);
                            this.employees.splice(index, 1);
                        }
                    });
                    this.employees.unshift({
                        name: empName,
                        empId: empId,
                        self: true,
                    });
                }
                this.userService.setemployeeSessionData(
                    this.employees,
                    sendPractice
                );
            },
            (error: HttpErrorResponse) => {
                this.snackBarService.openSnackBar(
                    ErrorMessageUtil.getErrorMessage(error)
                );
            }
        );
    }

    isPracticeAvailabe(): boolean {
        const {
            practice,
            isSuperAdmin,
        } = this.userService?.getUserSessionData();
        return isSuperAdmin || practice ? true : false;
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
    onRemoveSelectedSeat(seatDetails: FormGroup): void {
        $('img').mapster('set', true, seatDetails?.value?.seatId);
        let seatsArray = this.bookingForm.get('seats') as FormArray;
        const seatNo = seatDetails?.value?.seatNo;
        // removing seat from forms array
        seatsArray.removeAt(
            this.bookingForm.controls['seats'].value.findIndex(
                (seat: { seatNo: any }) => seat.seatNo === seatNo
            )
        );
        // removing seat from image - mapping
        $('img').mapster('set', false, seatDetails?.value?.seatId);

        this.removeSeatFromMappingList(seatNo);

        this.removeMemberSelection();
    }

    mapColours(showToolTip: Boolean): void {
        setTimeout(() => {
            $('img').mapster({
                showToolTip,
                toolTipContainer: `<div class="tooltip"></div>`,
                fillColor: '71F351',
                singleSelect: !this.isManager(), // check for manager
                mapKey: 'alt',
                areas: this.areas,
            });
        }, 100);
    }

    onSeatSelect(coordinate: Seat): void {
        this.submitted = false;
        let { subordinates } = this.userService.getUserSessionData();
        const subordinatesLength =
            this.superAdmin || this.isFacilityAdmin
                ? this.employees.length
                : subordinates.length + 1;
        let seatsArray = this.bookingForm.get('seats') as FormArray;

        if (
            coordinate.status === 'blocked' ||
            coordinate.status === 'booked' ||
            coordinate.status === 'unavailable' ||
            coordinate.status === 'reserved' ||
            this.isBlocked
        ) {
            return;
        } else if (
            this.isManager() &&
            seatsArray?.value?.length === subordinatesLength
        ) {
            const found = this.bookingForm.controls['seats'].value?.some(
                el => el.seatId === coordinate.seatId
            );
            if (found) {
                $('img').mapster('set_options', {
                    isSelectable: true,
                });
                seatsArray.removeAt(
                    this.bookingForm.controls['seats'].value.findIndex(
                        seat => seat.seatNo === coordinate.seatNo
                    )
                );

                this.removeSeatFromMappingList(coordinate.seatNo.toString());
                this.removeMemberSelection();
                return;
            }

            $('img').mapster('set_options', {
                isSelectable: false,
            });
            const errorMessage =
                this.superAdmin || this.isFacilityAdmin
                    ? 'You cannot select seats more than the total number of employees of the selected practice'
                    : 'You cannot select seats more than your subordinates';
            this.snackBarService.openSnackBar(errorMessage);
            return;
        } else {
            const found = this.bookingForm.controls['seats'].value?.some(
                el => el.seatId === coordinate.seatId
            );
            if (!found) {
                $('img').mapster('set_options', {
                    isSelectable: true,
                });
                if (!this.isManager()) {
                    seatsArray.clear();
                    seatsArray.setValue([]);
                    seatsArray.push(
                        this.getSeatFormGroup(
                            coordinate.seatNo,
                            coordinate.seatId
                        )
                    );
                } else if (
                    this.isManager() &&
                    seatsArray?.value?.length < subordinatesLength
                ) {
                    seatsArray.push(
                        this.getSeatFormGroup(
                            coordinate.seatNo,
                            coordinate.seatId
                        )
                    );
                    // this.disableMembers(seatsArray);
                }
            } else {
                seatsArray.removeAt(
                    this.bookingForm.controls['seats'].value.findIndex(
                        seat => seat.seatNo === coordinate.seatNo
                    )
                );

                this.removeSeatFromMappingList(coordinate.seatNo.toString());
                this.removeMemberSelection();
            }
        }
    }

    getSeatFormGroup(seatNo: any, seatId: any): FormGroup {
        return this.formBuilder.group({
            seatNo: [seatNo],
            seatId: [seatId],
        });
    }
    isManager(): boolean {
        return (
            this.userService?.getUserSessionData()?.hasSubordinates ||
            this.superAdmin ||
            this.isFacilityAdmin
        );
    }

    submit(): void {
        this.submitted = true;
        if (!this.bookingForm.valid) {
            return;
        }
        if (this.hasMemberAllocationError()) return;
        this.makeSeatBookingRequest(this.bookingForm.value);
    }

    hasMemberAllocationError(): Boolean {
        let seatsArray = this.bookingForm.get('seats') as FormArray;
        return this.subordinateSeatMapping.length > 1 ||
            this.superAdmin ||
            this.isFacilityAdmin
            ? !(
                  this.seatMappings.length >= 1 &&
                  seatsArray.length === this.seatMappings.length
              )
            : !(seatsArray.length <= 1);
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
        if (this.superAdmin || EXTRA_FACILITY_PRACTICES.includes(practice)) {
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
                this.filteredOption();
            }
            this.resetSelectedSeats();
            this.removeMemberSelection();
            this.resetFormFloorChange();
            this.selectFormControl.reset();
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
        if (this.superAdmin || this.isFacilityAdmin) {
            if (!this.userService.getemployeeSessionData()) {
                this.getEmployeesList(this.selectedFloorPractice);
            } else if (
                !(
                    this.selectedFloorPractice in
                    this.userService.getemployeeSessionData()
                )
            ) {
                this.getEmployeesList(this.selectedFloorPractice);
            } else {
                this.employees = this.userService.getemployeeSessionData()[
                    this.selectedFloorPractice
                ];
            }
        }
    }

    resetFormFloorChange(): void {
        this.submitted = false;
        this.bookingForm.controls?.vaccination?.reset();
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

    onSubordinateSelection(event: MatOptionSelectionChange): void {
        if (event.isUserInput) {
            let name = event?.source?.value?.name;
            let empId = event?.source?.value?.empId;
            if (event.source.selected) {
                const filteredArray = this.bookingForm.controls.seats?.value.filter(
                    value =>
                        this.seatMappings
                            .map(data => data.seatId)
                            .indexOf(value.seatId) === -1
                );
                let seatNo: any;
                let seatId: any;

                if (filteredArray.length) {
                    seatNo = filteredArray[0].seatNo;
                    seatId = filteredArray[0].seatId;
                    this.seatMappingMeta.push({ empId, seatNo }); // new
                    this.seatMappings.push({ name, empId, seatId, seatNo });
                } else {
                    this.snackBarService.openSnackBar(
                        'You cannot select subordinates more than selected seat'
                    );
                }
            } else {
                this.removeSeatByEmpId(empId);
            }
        }
        this.selectionChange(event);
    }
    // new
    getSeatNoByEmpId(empId: string): string {
        const seatFound =
            this.seatMappingMeta.find(item => item.empId === empId) || {};
        return seatFound.seatNo;
    }
    // new
    isSeatAlreadySelected(empId: string): boolean {
        const seatFound = this.getSeatNoByEmpId(empId);

        return (
            !seatFound &&
            this.seatMappingMeta.length ===
                this.bookingForm?.controls?.seats?.value?.length
        );
    }

    private removeMemberSelection(): void {
        const empIds = this.seatMappingMeta?.map(item => item.empId);
        if (
            (this.superAdmin || this.isFacilityAdmin) &&
            this.selectFormControl?.value
        ) {
            const formControlValues = [...this.selectFormControl?.value];
            formControlValues.forEach(item => {
                if (!empIds.includes(item.empId)) {
                    this.selectFormControl.value.splice(
                        this.selectFormControl.value.indexOf(item),
                        1
                    );
                }
            });

            this.employeesSelectionBox?.options['_results']?.forEach(
                (item, index) => {
                    if (!empIds.includes(item.value.empId)) {
                        item._selected = false;
                    }
                }
            );
        } else {
            this.subordinatesSelectionBox?.options?.forEach(item => {
                if (!empIds.includes(item.value.empId)) {
                    item.deselect();
                }
            });
        }
    }

    private removeSeatFromMappingList(value: string): void {
        this.seatMappings = this.seatMappings.filter(
            item => item.seatNo !== value
        );
        this.seatMappingMeta = this.seatMappingMeta.filter(
            item => item.seatNo !== value
        );
        if (this.seatMappingMeta.length < 1) {
            this.selectFormControl.reset();
        }
    }

    private removeSeatByEmpId(empId: string): void {
        this.seatMappings = this.seatMappings.filter(
            item => item.empId !== empId
        );
        this.seatMappingMeta = this.seatMappingMeta.filter(
            item => item.empId !== empId
        );
    }

    private makeSeatBookingRequest(formData: FormData): void {
        const {
            empId,
            empName,
            manager,
            title,
            approvalLevel,
        } = this.userService.getUserSessionData();

        const bookingData: BookSeatRequestPayload = {
            empId,
            practice: this.selectedFloorPractice,
            facilityName: this.floorData.facilityName,
            facilityId: this.floorData.facilityId,
            floorNo: this.floorData.floorNo,
            floorId: this.floorData.floorId,
            bookedByName: empName,
            selectedSeats:
                formData?.seats?.length >= 1 && this.seatMappings.length >= 1
                    ? this.seatMappings.map(seat => {
                          let currentSeat = {
                              seatId: seat.seatId,
                              seatNo: seat.seatNo,
                              bookedFor: seat.empId,
                              bookedForName: seat.name,
                          };
                          return currentSeat;
                      })
                    : [
                          {
                              seatId: formData.seats[0].seatId,
                              seatNo: formData.seats[0].seatNo,
                              bookedFor: empId.toUpperCase(),
                              bookedForName: empName,
                          },
                      ],
            fromDate: formatDate(formData.dateRange.start),
            toDate: formatDate(formData.dateRange.end),
            requestSummary: formData.booking?.trim(),
            L1Approver: manager,
            title,
            vaccinationStatus: formData.vaccination,
        };
        this.isBooking = true;
        $('img').mapster('set_options', {
            showToolTip: false,
        });
        const roles = RESPONSIBILTY_ASSIGN[0];
        this.bookingService
            .bookSeat(bookingData)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BookSeatResponse) => {
                    if (approvalLevel !== ApprovalLevel.l2) {
                        this.wsService.emit(SOCKET_EVENTS.NEW, {
                            manager,
                            practice: this.selectedFloorPractice,
                            roles,
                            approvalLevel,
                        });
                    }
                    this.router.navigate(['/booking', res?.data?.requestId]);
                    this.isBooking = false;
                },
                (error: HttpErrorResponse) => {
                    this.snackBarService.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(error)
                    );
                    $('img').mapster('set_options', {
                        showToolTip: true,
                    });
                    this.isBooking = false;
                }
            );
    }

    private initFloorNo(): void {
        const {
            practice = '',
            empName,
            empId,
            subordinates,
            assignedPractices,
        } = this.userService.getUserSessionData();
        this.subordinateSeatMapping = subordinates.map(subordinate => ({
            ...subordinate,
            seatNo: '',
            seatId: '',
            self: false,
        }));

        this.subordinateSeatMapping.unshift({
            name: empName,
            empId: empId,
            seatNo: '',
            seatId: '',
            self: true,
        });
        this.floorDetails = FLOOR_MAPPING_BY_PRACTICE[practice];
        if (this.superAdmin || EXTRA_FACILITY_PRACTICES.includes(practice)) {
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
                        isFloorAvailableForBooking,
                    } = this.floorData?.listingData[0];
                    const queryDate = moment(
                        params.fromDate,
                        'DD-MM-YYYY'
                    ).toDate();
                    const indefiniteBlockingFromDate = moment(
                        formatDate(this.floorData.indefiniteBlockingFromDate),
                        'DD-MM-YYYY'
                    ).toDate();
                    if (
                        !isFloorAvailableForBooking ||
                        queryDate >= indefiniteBlockingFromDate
                    ) {
                        this.isBlocked = true;
                        // make coordinates empty, no color mapping
                        totalSeatsCount = 0;
                        availableSeatsCount = 0;
                        blockedSeatsCount = 0;
                        bookedSeatsCount = 0;
                    } else {
                        this.isBlocked = false;
                    }
                    //fun for coloring blocked, available areas
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
            dateRange: this.formBuilder.group({
                start: [new Date(), Validators.required],
                end: [new Date(), Validators.required],
            }),
            booking: [null, [Validators.required, noWhitespaceValidator]],
            seats: this.formBuilder.array([], Validators.required),
            subordinates: [null, [this.validateMappings.bind(this)]],
            vaccination: [null, [Validators.required]],
        });

        if (this.isPracticeAvailabe()) {
            this.bookingForm
                .get(['dateRange', 'end'])
                .valueChanges.pipe(takeUntil(this.ngUnsubscribe))
                .subscribe(bookingDate => {
                    this.fromDate = this.bookingForm.get([
                        'dateRange',
                        'start',
                    ]).value;
                    this.toDate = this.bookingForm.get([
                        'dateRange',
                        'end',
                    ]).value;
                    if (!this.endDate && this.fromDate && this.toDate) {
                        this.endDate = this.toDate;
                        this.setCoordinates();
                    }
                    if (
                        this.endDate !== this.toDate &&
                        this.fromDate &&
                        this.toDate
                    ) {
                        this.setCoordinates();
                    }
                    this.endDate = this.toDate;
                });
        } else {
            this.bookingForm.disable();
        }
    }
    private setCoordinates() {
        this.initCoordinates(this.fromDate, this.toDate);
        this.resetSelectedSeats();
        this.removeMemberSelection();
        this.selectFormControl.reset();
        this.bookingForm.controls?.vaccination?.reset();
        this.submitted = false;
    }

    private resetSelectedSeats(): void {
        let seatsArray = this.bookingForm.get('seats') as FormArray;
        seatsArray.clear();
        this.seatMappings.splice(0, this.seatMappings?.length);
        this.seatMappingMeta.splice(0, this.seatMappingMeta?.length);
        this.floorDataFound = true;
        this.isBlocked = false;
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
                    highlight: false,
                    toolTip: `<div>
                      <div>Seat No. ${i.seatNo}</div>
                      <div>Occupied By: ${i.bookedForName}</div>
                    </div>`,
                    render_select: {
                        fillColor: 'ff0000',
                        stroke: true,
                    },
                });
            } else if (i.status === 'unavailable' || this.isBlocked) {
                this.areas.push({
                    key: i.seatId,
                    staticState: true,
                    highlight: false,
                    toolTip: `<div>
                      <div>Seat No. ${i.seatNo}</div>
                      <div>Seat blocked</div>
                    </div>`,
                    render_select: {
                        fillColor: '616B73',
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
                    toolTip: `Seat No. ${i.seatNo}`,
                });
            }
        }
    }
}

export interface FormData {
    seats: { seatNo: any; seatId: any }[];
    dateRange: {
        start: moment.MomentInput;
        end: moment.MomentInput;
    };
    booking: any;
    subordinates: any[];
    vaccination: string;
}
