import {
    Component,
    ElementRef,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
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
import {
    DialogComponent,
    DialogProp,
} from 'src/app/common-component/dialog-component/dialog.component';

import {
    DelegateEmployeePayload,
    delegateEmployeeRes,
    EmployeeList,
    EmployeeListRes,
    FacilityAdminsList,
    FacilityAdminsListRes,
    RemoveFacilityAdminRes,
} from 'src/app/models/admin.model';
import { TableProperties } from 'src/app/models/table-component.model';
import { AdminService } from 'src/app/services/admin.service';
import { SnackBarService } from 'src/app/services/snackbar.service';
import {
    ANONYMOUS_ERROR,
    FACILITY_PRACTICES,
    RESPONSIBILTY_ASSIGN,
} from 'src/app/util/constants';
import { formatDate } from 'src/app/util/date-formats';
import { MyErrorStateMatcher } from 'src/app/util/error-msg-util';

@Component({
    selector: 'app-delegations',
    templateUrl: './delegations.component.html',
    styleUrls: ['./delegations.component.scss'],
})
export class DelegationsComponent implements OnInit, OnDestroy {
    @ViewChild('employeeInput') employeeInput: ElementRef<HTMLInputElement>;
    allFacilityAdmins: FacilityAdminsList[];
    selectFormControl: FormGroup;
    filteredEmployees: EmployeeList[];
    isLoading = false;
    isFormSubmit = false;
    isEditForm = false;
    searchRes = '';
    isAdmin: FacilityAdminsList[];
    practiceList: string[] = FACILITY_PRACTICES;
    roleList: string[] = RESPONSIBILTY_ASSIGN;
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    matcher = new MyErrorStateMatcher();
    // Table components fields
    tableLoader = false;
    displayedColumns: string[] = [
        'name',
        'empId',
        'assignedPractices',
        'createdAt',
        'roles',
        'actions',
    ];
    masterTableFields: TableProperties[] = [
        {
            fieldName: 'name',
            headerName: 'Employee Name',
            cellContent: 'text',
        },
        {
            fieldName: 'empId',
            headerName: 'Employee Id',
            cellContent: 'text',
        },
        {
            fieldName: 'assignedPractices',
            headerName: 'Assigned Practices',
            cellContent: 'text',
        },
        {
            fieldName: 'createdAt',
            headerName: 'Created At',
            cellContent: 'text',
        },
        {
            fieldName: 'roles',
            headerName: 'Roles',
            cellContent: 'text',
        },
        {
            fieldName: 'actions',
            headerName: 'Actions',
            cellContent: 'button',
            buttonProperties: [{ value: 'delete', buttonText: 'Remove' }],
        },
    ];
    constructor(
        public dialog: MatDialog,
        private readonly adminService: AdminService,
        private readonly snackBarService: SnackBarService
    ) {}

    ngOnInit(): void {
        this.initDelegateAdminForm();
        this.getAllAdmins();
        this.searchEmployee();
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    private initDelegateAdminForm(): void {
        this.selectFormControl = new FormGroup({
            searchFormControl: new FormControl('', [Validators.required]),
            selectPractice: new FormControl('', Validators.required),
            selectRole: new FormControl('', Validators.required),
        });
    }

    // search employee by their name using server-side filtering.
    private searchEmployee(): void {
        this.selectFormControl
            .get('searchFormControl')
            .valueChanges.pipe(
                debounceTime(300),
                distinctUntilChanged(),
                tap(name => {
                    if (!name) {
                        this.isLoading = false;
                        this.searchRes = '';
                        this.filteredEmployees = [];
                    } else if (typeof name !== 'object') {
                        this.isLoading = true;
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
                    this.isLoading = false;
                    if (res.data.length > 0) {
                        this.searchRes = '';
                        this.filteredEmployees = res.data.filter(
                            emp =>
                                !this.allFacilityAdmins.find(
                                    empAdmin =>
                                        empAdmin.empId.toLowerCase() ===
                                        emp.empId.toLowerCase()
                                ) &&
                                !this.isAdmin.find(
                                    emplist =>
                                        emplist.empId.toLowerCase() ===
                                        emp.empId.toLowerCase()
                                )
                        );
                    } else {
                        this.filteredEmployees = [];
                        this.searchRes = 'No result found!';
                    }
                },
                _error => {
                    this.isLoading = false;
                    console.log(_error);
                    this.snackBarService.openSnackBar(ANONYMOUS_ERROR);
                }
            );
    }

    // select employee from server-side filtered list.
    selected(event: MatAutocompleteSelectedEvent): void {
        if (!event.option) {
            return;
        }
        this.isLoading = false;
        this.filteredEmployees = [];
    }

    onFormSubmit(): void {
        if (!this.selectFormControl.invalid) {
            const requiredParam = {
                empId: this.selectFormControl?.controls?.searchFormControl
                    ?.value?.empId,
                practices: this.selectFormControl?.controls?.selectPractice
                    ?.value,
                roles: this.selectFormControl?.controls?.selectRole?.value,
            };
            this.delegateEmployee(requiredParam);
        }
    }

    resetForm(): void {
        this.selectFormControl.reset();
        this.filteredEmployees = [];
        this.searchRes = '';
        this.employeeInput.nativeElement.value = '';
        this.isEditForm = false;
        this.isLoading = false;
    }

    // display employee name
    displayFn(emp: EmployeeList): string {
        return emp && emp.name ? emp.name : '';
    }

    // for handling remove admin
    onButtonClicked(buttonEvent: DelegationActionClickedEvent): void {
        event.stopPropagation();
        const rowData = buttonEvent?.row;
        if (buttonEvent?.buttonClicked === 'delete') {
            const data: DialogProp = {
                id: 'remove-facility-admin-dialog',
                width: '550px',
                minHeight: '250px',
                panelClass: 'modelbox-styles',
                data: {
                    dialogType: 'confirmation',
                    title: 'Remove Delegated Admin',
                    proceed: true,
                    message: `Are you sure you want to remove the <b>${rowData?.name}</b> from the delegated admin list?`,
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
            this.openDialog(rowData, data);
        }
    }

    private openDialog(rowInfo, data): void {
        const dialogRef = this.dialog.open(DialogComponent, data);

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.proceed === 'proceed') {
                this.removeFacilityAdmin(rowInfo.empId);
            }
        });
    }

    // on click on row edit delegate admin form
    onRowClickedEvent(rowEvent: FacilityAdminsList): void {
        this.isEditForm = true;
        const emp = { empId: rowEvent?.empId, name: rowEvent?.name };
        this.selectFormControl.setValue({
            searchFormControl: emp,
            selectPractice: rowEvent?.assignedPractices,
            selectRole: rowEvent?.roles,
        });
    }

    checkDisabled(): boolean {
        if (
            this.selectFormControl.valid &&
            this.selectFormControl.dirty &&
            this.selectFormControl.controls?.searchFormControl?.value?.empId &&
            !this.isFormSubmit
        ) {
            return false;
        }
        return true;
    }

    private getAllAdmins(): void {
        this.tableLoader = true;
        this.adminService
            .listFacilityAdmins()
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: FacilityAdminsListRes) => {
                    this.allFacilityAdmins = res.facilityAdmins.filter(
                        data => data.isSuperAdmin === false
                    );
                    this.isAdmin = res.facilityAdmins.filter(
                        data => data.isSuperAdmin === true
                    );
                    for (const allAdminsData in this.allFacilityAdmins) {
                        this.allFacilityAdmins[
                            allAdminsData
                        ].createdAt = moment(
                            this.allFacilityAdmins[allAdminsData].createdAt
                        ).format('LL');
                    }
                    this.tableLoader = false;
                },
                error => {
                    this.tableLoader = false;
                    console.error(error);
                    this.snackBarService.openSnackBar(ANONYMOUS_ERROR);
                }
            );
    }

    private delegateEmployee(payload: DelegateEmployeePayload): void {
        this.isFormSubmit = true;
        this.adminService
            .delegateEmployee(payload)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: delegateEmployeeRes) => {
                    this.isFormSubmit = false;
                    this.snackBarService.openSnackBar(res.message);
                    this.resetForm();
                    this.getAllAdmins();
                },
                _error => {
                    this.isFormSubmit = false;
                    console.error(_error);
                    this.snackBarService.openSnackBar(_error.error.message);
                }
            );
    }
    private removeFacilityAdmin(empId: string): void {
        this.tableLoader = true;
        this.adminService
            .removeFacilityAdmin(empId)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: RemoveFacilityAdminRes) => {
                    this.snackBarService.openSnackBar(res.message);
                    this.getAllAdmins();
                    this.tableLoader = false;
                },
                _error => {
                    this.tableLoader = false;
                    console.error(_error);
                }
            );
    }
}

// Types for table data
export interface DelegationActionClickedEvent {
    buttonClicked: Actions;
    row: FacilityAdminsList;
}
export declare type Actions = 'delete';
