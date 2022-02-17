import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    switchMap,
    takeUntil,
    tap,
} from 'rxjs/operators';
import { VisitConfirmationComponent } from '../confirmation/visit-confirmation/visit-confirmation.component';
import { EmployeeList, EmployeeListRes } from '../models/admin.model';
import {
    VisitBookingRequestPayLoad,
    VisitBookResponse,
} from '../models/booking-component.model';
import { AdminService } from '../services/admin.service';
import { BookingService } from '../services/booking.service';
import { SnackBarService } from '../services/snackbar.service';
import { UserService } from '../services/user.service';
import { WebSocketService } from '../services/web-socket.service';
import {
    ANONYMOUS_ERROR,
    CATEGORY_ID,
    RESPONSIBILTY_ASSIGN,
    SOCKET_EVENTS,
} from '../util/constants';
import { formatDate } from '../util/date-formats';
import { ErrorMessageUtil, MyErrorStateMatcher } from '../util/error-msg-util';

@Component({
    selector: 'app-visit-booking',
    templateUrl: './visit-booking.component.html',
    styleUrls: ['./visit-booking.component.scss'],
})
export class VisitBookingComponent implements OnInit {
    matcher = new MyErrorStateMatcher();
    constructor(
        private readonly visitBookingService: BookingService,
        private userService: UserService,
        private readonly adminService: AdminService,
        private readonly snackBarService: SnackBarService,
        private readonly wsService: WebSocketService,
        public dialog: MatDialog
    ) {}
    filteredEmployees: EmployeeList[];
    categoryId: string[] = CATEGORY_ID.sort();
    todaysDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    maxDate = moment(this.todaysDate)
        .add(7, 'days')
        .format();
    isLoading = false;
    isSearching = false;
    searchRes = '';
    nonWhitespaceRegExp: RegExp = new RegExp('\\S');
    visitBookForm: FormGroup;
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    ngOnInit() {
        this.visitBookingForm();
        this.searchEmployee();
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    visitBookingForm(): any {
        this.visitBookForm = new FormGroup({
            date: new FormControl(moment(), [Validators.required]),
            reason: new FormControl(
                '',
                Validators.pattern(this.nonWhitespaceRegExp)
            ),
            category: new FormControl('', Validators.required),
            concernedPerson: new FormControl('', [
                Validators.required,
                Validators.pattern(this.nonWhitespaceRegExp),
            ]),
            vaccination: new FormControl('', Validators.required),
        });
        this.visitBookForm.get('date').setValue(this.todaysDate);
    }

    // display employee name
    displayFn(emp: EmployeeList): string {
        return emp && emp.name ? emp.name : '';
    }

    // select employee from server-side filtered list.
    selected(event: MatAutocompleteSelectedEvent): void {
        if (!event.option) {
            return;
        }
        this.isSearching = false;
        this.filteredEmployees = [];
    }

    // search employee by their name using server-side filtering.
    private searchEmployee(): void {
        this.visitBookForm
            .get('concernedPerson')
            .valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged(),
                tap(name => {
                    if (!name) {
                        this.isSearching = false;
                        this.searchRes = '';
                        this.filteredEmployees = [];
                    } else if (typeof name !== 'object') {
                        this.isSearching = true;
                    }
                }),
                filter(name => name && name.length > 0),
                takeUntil(this.ngUnsubscribe),
                switchMap(name =>
                    this.adminService.getEmployees({ search: name })
                )
            )
            .subscribe(
                (res: EmployeeListRes) => {
                    this.isSearching = false;
                    if (res.data.length > 0) {
                        this.searchRes = '';
                        this.filteredEmployees = res.data.filter(
                            emp =>
                                emp.empId.toLowerCase() !==
                                this.userService
                                    ?.getUserSessionData()
                                    ?.empId.toLowerCase()
                        );
                    } else {
                        this.filteredEmployees = [];
                        this.searchRes = 'No result found!';
                    }
                },
                _error => {
                    this.isSearching = false;
                    this.snackBarService.openSnackBar(ANONYMOUS_ERROR);
                }
            );
    }

    onSubmit(): any {
        if (!this.visitBookForm.valid) {
            return;
        }
        this.isLoading = true;
        const formatdate = this.visitBookForm.get('date').value;
        const date = formatDate(formatdate);
        const requestSummary = this.visitBookForm.get('reason').value?.trim();
        const category = this.visitBookForm.get('category').value;
        const concernedEmpName = this.visitBookForm.get('concernedPerson').value
            .name;
        const concernedEmpId = this.visitBookForm.get('concernedPerson').value
            .empId;
        const vaccinationStatus = this.visitBookForm.get('vaccination').value;
        const { practice = '' } = this.userService.getUserSessionData();

        const visitbookingData: VisitBookingRequestPayLoad = {
            date,
            requestSummary,
            category,
            concernedEmpName,
            concernedEmpId,
            practice,
            vaccinationStatus,
        };

        const roles = RESPONSIBILTY_ASSIGN[1];
        this.visitBookingService.visitBook(visitbookingData).subscribe(
            (res: VisitBookResponse) => {
                this.isLoading = false;
                this.wsService.emit(SOCKET_EVENTS.NEW, {
                    practice,
                    roles,
                });
                this.onResetForm();
                this.openDialog();
            },
            (_error: HttpErrorResponse) => {
                this.isLoading = false;
                this.snackBarService.openSnackBar(
                    ErrorMessageUtil.getErrorMessage(_error)
                );
            }
        );
    }
    private openDialog(): void {
        this.dialog.open(VisitConfirmationComponent, {
            autoFocus: false,
            panelClass: 'visit-confirmation-style',
        });
    }

    onResetForm(): void {
        this.visitBookForm.reset();
        this.isSearching = false;
    }
}
