import {
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
    AfterViewInit,
} from '@angular/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { PageEvent } from '@angular/material/paginator';
import * as moment from 'moment';
import { BookingRequestStatuses } from 'src/app/history/booking-history/booking-status-map';
import { BlockHistoryListItem } from 'src/app/models/block-facility.model';
import {
    FilterOptions,
    ResetFilterEvent,
    StatusFilterEvent,
    TableProperties,
} from '../../models/table-component.model';

@Component({
    selector: 'app-table',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss'],
})
export class TableComponent implements OnInit, AfterViewInit {
    @Input() tablePropertiesToColumn: TableProperties[] = [];

    @Input() columnToBeDisplayed: string[] = [];

    @Input() tableData = [];

    @Input() tableLoader = true;

    @Input() paginationModel: TablePaginationModel;

    @Input() showPagination = true;

    @Input() filters = false;

    @Input() showLegend = false;

    @Input() filterOptions: FilterOptions;

    @Output() readonly linkClickedEvent: EventEmitter<any> = new EventEmitter<
        any
    >();

    @Output() readonly iconClickedEvent: EventEmitter<any> = new EventEmitter<
        any
    >();

    @Output() readonly rowClickedEvent: EventEmitter<any> = new EventEmitter<
        any
    >();

    @Output() readonly buttonClickedEvent: EventEmitter<
        any
    > = new EventEmitter();

    @Output() readonly paginationChanges: EventEmitter<
        PageEvent
    > = new EventEmitter<PageEvent>();

    @Output()
    readonly resetFilterEvent: EventEmitter<
        ResetFilterEvent
    > = new EventEmitter<ResetFilterEvent>();

    @Output()
    readonly statusSelectionChange: EventEmitter<
        StatusFilterEvent
    > = new EventEmitter<StatusFilterEvent>();

    @Output() readonly dateSelectionChange: EventEmitter<
        MatDatepickerInputEvent<Date>
    > = new EventEmitter<MatDatepickerInputEvent<Date>>();

    statusFilterValue: string | null = null;
    dateFilterValue: Date | null = null;
    todaysDate = moment()
        .hour(0)
        .minute(0)
        .seconds(0)
        .format();

    ngOnInit(): void {}

    ngAfterViewInit(): void {}

    onLinkClick($linkEvent): void {
        this.linkClickedEvent.emit($linkEvent);
    }

    onIconClick($iconEvent): void {
        this.iconClickedEvent.emit($iconEvent);
    }

    onRowClick($rowEvent): void {
        this.rowClickedEvent.emit($rowEvent);
    }

    onButtonClick($buttonEvent): void {
        this.buttonClickedEvent.emit($buttonEvent);
    }

    onPaginationChange($event: PageEvent): void {
        this.paginationChanges.emit($event);
    }

    onResetClick(): void {
        this.statusFilterValue = null;
        this.dateFilterValue = null;
        this.resetFilterEvent.emit({ value: 'reset' });
    }

    onStatusFilterChange($event): void {
        this.statusSelectionChange.emit($event);
    }

    onDateFilterChange($event): void {
        this.dateSelectionChange.emit($event);
    }

    isMultiple(content): Boolean {
        return Array.isArray(content) && content.length > 1;
    }

    checkColumn(list): boolean {
        return list.find(data => data === 'assignedPractices');
    }
    getTooltip(column, row): boolean {
        return column.fieldName === 'status' &&
            ((row?.blockedDates?.length &&
                (row?.status === BookingRequestStatuses.PENDING_L1 ||
                    row?.status === BookingRequestStatuses.PENDING_L2 ||
                    row?.status === BookingRequestStatuses.APPROVED)) ||
                    (row?.cancelledDates?.length && 
                        ((moment(row?.fromDate).isBefore(this.todaysDate, 'day')) ||
                        (row?.status === BookingRequestStatuses.PENDING_L1 ||
                            row?.status === BookingRequestStatuses.PENDING_L2 ||
                            row?.status === BookingRequestStatuses.APPROVED))))    
            ? true
            : false;
    }

    tableHover(element, column) {
        if (column?.fieldName === 'facilityFloor') {
            return element?.facilityName;
        } else if (column?.fieldName === 'blockedBy') {
            return element?.blockedByName;
        } else if (column?.fieldName === 'employeeId') {
            return element?.bookedByName;
        } else {
            return element[column.fieldName];
        }
    }
}

export class TablePaginationModel {
    pageSize: number;
    pageSizeOptions: number[];
    pageIndex: number;
    totalRecords: number;

    private readonly ten = 10;
    private readonly twenty = 20;
    private readonly thirty = 30;

    constructor() {
        // Default values
        this.pageSize = this.ten;
        this.pageSizeOptions = [this.ten, this.twenty, this.thirty];
        this.pageIndex = 0;
        this.totalRecords = 0;
    }
}
