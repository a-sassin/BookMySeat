import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { ApprovalLevel } from 'src/app/models/role';
import { UserService } from 'src/app/services/user.service';
import {
    FLOOR_MAPPING_TO_NAME,
    RESPONSIBILTY_ASSIGN,
} from 'src/app/util/constants';
import { formatDate } from 'src/app/util/date-formats';
@Component({
    selector: 'app-floor-cards',
    templateUrl: './floor-cards.component.html',
    styleUrls: ['./floor-cards.component.scss'],
})
export class FloorCardsComponent implements OnInit, OnChanges {
    @Input() floorData: any;
    @Input() currentFacilityId: any;

    floorList = [];

    todaysDate = moment().format('L');
    selectedFilterDate = moment(this.todaysDate).toDate();
    facilityId = '';
    loader = true;
    showVisitReport: boolean;
    isUserSuperAdmin: boolean;
    minDate = moment()
        .subtract(1, 'year')
        .format();
    maxDate = moment()
        .add(30, 'days')
        .format();
    selectDate: FormControl;
    @Output() summaryEvent = new EventEmitter();
    @Input() currentDate;

    constructor(
        private readonly router: Router,
        private readonly userService: UserService
    ) {}

    ngOnInit(): void {
        this.showVisitCard();
        this.selectDate = new FormControl(new Date());
    }

    ngOnChanges() {
        this.floorList = this.floorData;
        this.facilityId = this.currentFacilityId;
    }

    onViewDetails(facilityId: string, floorId: string): void {
        const date = this.selectedFilterDate;
        this.router.navigate([
            '/admin/reports',
            facilityId,
            floorId,
            formatDate(date),
        ]);
    }

    getFloorDisplayValue(floorNo): string {
        return FLOOR_MAPPING_TO_NAME[floorNo];
    }

    onDateFilterChange($event: MatDatepickerInputEvent<Date>) {
        const { value } = $event;
        this.selectedFilterDate = value || null;
        this.summaryEvent.emit(this.selectedFilterDate);
    }

    resetDate(date: any): void {
        this.selectDate.setValue(date['_d']);
    }

    private showVisitCard(): void {
        this.isUserSuperAdmin = this.userService?.getUserSessionData()?.isSuperAdmin;
        this.showVisitReport =
            this.userService?.getUserSessionData()?.approvalLevel ===
                ApprovalLevel.l2 &&
            this.userService
                ?.getUserSessionData()
                ?.roles.includes(RESPONSIBILTY_ASSIGN[1]);
    }
}
