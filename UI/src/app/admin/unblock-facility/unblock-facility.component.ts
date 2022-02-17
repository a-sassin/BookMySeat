import {
    Component,
    EventEmitter,
    OnInit,
    Output,
    OnDestroy,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
    MAT_MOMENT_DATE_ADAPTER_OPTIONS,
    MomentDateAdapter,
} from '@angular/material-moment-adapter';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatDatepicker } from '@angular/material/datepicker';
import * as moment from 'moment';
import { Moment } from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
    BlockFacilityPayload,
    BlockHistoryListItem,
    BlockHistoryParams,
    BlockHistoryResponse,
} from 'src/app/models/block-facility.model';
import { BlockService } from 'src/app/services/block.service';
import { SnackBarService } from 'src/app/services/snackbar.service';
import {
    FACILITY_NAME,
    INDEFINITE_DATE,
    SEREVR_INDEFINITE_DATE,
} from 'src/app/util/constants';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';

export const MY_FORMATS = {
    parse: {
        dateInput: 'MM/YYYY',
    },
    display: {
        dateInput: 'MMM YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY',
    },
};

@Component({
    selector: 'app-unblock-facility',
    templateUrl: './unblock-facility.component.html',
    styleUrls: ['./unblock-facility.component.scss'],
    providers: [
        {
            provide: DateAdapter,
            useClass: MomentDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
        },

        { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    ],
})
export class UnblockFacilityComponent implements OnInit, OnDestroy {
    @Output() newItemEvent = new EventEmitter<string>();
    constructor(
        private readonly blockService: BlockService,
        private readonly showNotification: SnackBarService
    ) {}

    calenderView = [];
    days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    date = new FormControl(moment());
    year: number;
    month: number;
    blockingHistoryList: BlockHistoryListItem[] = [];
    tableLoader = false;
    reload: boolean;
    dateRangeToggle = true;
    todaysDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();
    minDate = moment().subtract(3, 'M');
    maxDate = moment(this.todaysDate)
        .add(1, 'M')
        .format();
    leftArrowDisable = true;
    rightArrowDisable = true;
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    ngOnInit(): void {
        this.year = moment().year();
        this.month = moment().month() + 1;
        this.getMonthDates(
            moment(this.date.value).year(),
            moment(this.date.value).month()
        );
        this.getBlockHistory(this.getBlockHistoryRequiredParams());
    }

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    onDateClick(date: any, buildingName: string) {
        const blockedDates = this.cellBlockedDates(
            date,
            buildingName,
            this.dateRangeToggle
        );
        this.newItemEvent.emit(blockedDates);
    }

    chosenYearHandler(normalizedYear: Moment) {
        const ctrlValue = this.date.value;
        ctrlValue.year(normalizedYear.year());
        this.year = normalizedYear.year();
        this.date.setValue(ctrlValue);
    }

    chosenMonthHandler(
        normalizedMonth: Moment,
        datepicker: MatDatepicker<Moment>
    ) {
        const ctrlValue = this.date.value;
        ctrlValue.month(normalizedMonth.month());
        this.month = normalizedMonth.month() + 1;
        this.date.setValue(ctrlValue);
        datepicker.close();
        const selectedDate = this.date.value;
        this.getMonthDates(
            moment(selectedDate).year(),
            moment(selectedDate).month()
        );
        this.isRightArrowDisable(ctrlValue.year(), ctrlValue.month());
        this.isLeftArrowDisable(ctrlValue.year(), ctrlValue.month());
        this.getBlockHistory(this.getBlockHistoryRequiredParams());
    }

    getIndex(dayName: string): number {
        return this.days.indexOf(dayName);
    }

    changeMonth(action: string): void {
        const selectedDate = this.date.value;
        let month = moment(selectedDate).month();
        let year = moment(selectedDate).year();
        if (action === 'next') {
            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
        } else {
            month -= 1;
            if (month < 0) {
                month = 11;
                year -= 1;
            }
        }
        this.isRightArrowDisable(year, month);
        this.isLeftArrowDisable(year, month);
        this.year = year;
        this.month = month + 1;
        const ctrlValue = this.date.value;
        ctrlValue.month(month);
        ctrlValue.year(year);
        this.date.setValue(moment(ctrlValue));
        this.getMonthDates(year, month);
        this.getBlockHistory(this.getBlockHistoryRequiredParams());
    }

    private isRightArrowDisable(year: any, month: any) {
        moment()
            .year(year)
            .month(month)
            .isSameOrAfter(moment(this.maxDate))
            ? (this.rightArrowDisable = false)
            : (this.rightArrowDisable = true);
    }

    private isLeftArrowDisable(year: number, month: number) {
        moment().diff(
            moment()
                .year(year)
                .month(month),
            'months',
            true
        ) > 2
            ? (this.leftArrowDisable = false)
            : (this.leftArrowDisable = true);
    }

    private getMonthDates(year: number, month: number): void {
        const date = new Date(year, month, 1);
        this.calenderView = [];
        while (date.getMonth() === month) {
            this.calenderView.push({
                day: this.days[date.getDay()],
                date: date.getDate(),
            });
            date.setDate(date.getDate() + 1);
        }
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
                            fromDate: history.fromDate,
                            toDate: history.toDate,
                            reason: history.reason,
                            id: history.id,
                            building: history?.facility?.facilityId,
                            floors: history?.facility?.floors,
                        })
                    );
                },
                _error => {
                    this.tableLoader = false;
                    this.showNotification.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    cellBlockedDates(
        cellDate: number,
        buildingName: string,
        datesStoreToggle: boolean
    ): any {
        let date = moment()
            .year(this.year)
            .month(this.month - 1)
            .date(cellDate)
            .format('L');
        const dates: Array<BlockFacilityPayload> = [];
        for (const listIndex in this.blockingHistoryList) {
            const fromDate = moment(
                this.blockingHistoryList[listIndex].fromDate
            ).format('L');
            const toDate = moment(
                this.blockingHistoryList[listIndex].toDate
            ).format('L');
            const tDate = datesStoreToggle
                ? toDate
                : toDate === INDEFINITE_DATE
                ? fromDate
                : toDate;
            const isBetween = moment(date).isBetween(
                fromDate,
                tDate,
                undefined,
                '[]'
            );
            const isBuilding =
                buildingName === this.blockingHistoryList[listIndex].building;
            const isFloor =
                this.blockingHistoryList[listIndex].floors.length >= 1;
            if (isBetween && isBuilding && isFloor) {
                dates.push({
                    id: this.blockingHistoryList[listIndex].id,
                    fromDate: this.blockingHistoryList[listIndex].fromDate,
                    toDate:
                        this.blockingHistoryList[listIndex].toDate ===
                        SEREVR_INDEFINITE_DATE
                            ? 'Indefinite range'
                            : this.blockingHistoryList[listIndex].toDate,
                    data: {
                        facilityId: this.blockingHistoryList[listIndex]
                            .building,
                        floors: this.blockingHistoryList[listIndex].floors,
                    },
                });
            }
        }
        return dates.length >= 1 ? dates : false;
    }

    collapseDate(cellDate: any, buildingName: any): any {
        const dates = this.cellBlockedDates(
            cellDate,
            buildingName,
            !this.dateRangeToggle
        );
        if (dates[0].toDate === 'Indefinite range') {
            return 'indefinte-blocked-flooor';
        } else if (moment(dates[0].toDate).isBefore(this.todaysDate)) {
            return 'disable-facility';
        } else {
            if (buildingName === FACILITY_NAME.aag) {
                return `${FACILITY_NAME.aag.toLowerCase()}`;
            } else if (buildingName === FACILITY_NAME.adisa) {
                return `${FACILITY_NAME.adisa.toLowerCase()}`;
            } else {
                return `${FACILITY_NAME.vantage.toLowerCase()}`;
            }
        }
    }

    private getBlockHistoryRequiredParams(): BlockHistoryParams {
        return {
            month: this.month.toString(),
            year: this.year.toString(),
            offset: '0',
            limit: '31',
        };
    }
}
