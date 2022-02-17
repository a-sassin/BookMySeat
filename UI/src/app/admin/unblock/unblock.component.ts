import { HttpErrorResponse } from '@angular/common/http';
import { OnDestroy } from '@angular/core';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as moment from 'moment';
import {
    BlockFacilityPayload,
    BlockFacilityResponse,
    BlockHistoryParams,
    EditBlockFacilityParams,
} from 'src/app/models/block-facility.model';
import { BlockService } from 'src/app/services/block.service';
import { SnackBarService } from 'src/app/services/snackbar.service';
import { ErrorMessageUtil } from 'src/app/util/error-msg-util';
import { INDEFINITE_DATE } from 'src/app/util/constants';
import { formatDate } from 'src/app/util/date-formats';

@Component({
    selector: 'app-unblock',
    templateUrl: './unblock.component.html',
    styleUrls: ['./unblock.component.scss'],
})
export class UnblockComponent implements OnInit, OnDestroy {
    @ViewChild('drawer', { static: false }) public drawer: MatDrawer;
    showFiller: boolean = false;
    panelOpenState: boolean = false;
    isFloorBlocked: any = {
        id: '',
        fromDate: '',
        toDate: '',
        data: {
            facilityId: '',
            floors: [],
        },
    };
    unblockFloors: Array<string> = [];
    blockedData: BlockFacilityPayload;
    loading: boolean = false;
    isButton: boolean = true;
    isDate: boolean = false;
    value: string = 'Select Date';
    newData: any;
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    constructor(
        private readonly showNotification: SnackBarService,
        private readonly blockService: BlockService
    ) {}
    ngOnInit(): void {}

    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }
    getDate(event: BlockFacilityPayload): void {
        this.blockedData = event;
        this.drawer.toggle();
        this.resetDateForm();
    }

    resetDateForm(): void {
        this.isFloorBlocked = {
            id: '',
            fromDate: '',
            toDate: '',
            data: {
                facilityId: '',
                floors: [],
            },
        };
        this.unblockFloors = [];
        this.isDate = false;
        this.isButton = true;
        this.value = 'Select Date';
    }
    onDateChange(data): void {
        if (this.newData != data) {
            this.isButton = true;
            this.unblockFloors = [];
            for (const listFloor in this.blockedData) {
                if (this.blockedData[listFloor] === data) {
                    this.isFloorBlocked.id = this.blockedData[listFloor].id;
                    this.isFloorBlocked.fromDate = this.blockedData[
                        listFloor
                    ].fromDate;
                    this.isFloorBlocked.toDate = this.blockedData[
                        listFloor
                    ].toDate;
                    this.isFloorBlocked.data.facilityId = this.blockedData[
                        listFloor
                    ].data.facilityId;
                    this.isFloorBlocked.data.floors = this.blockedData[
                        listFloor
                    ].data.floors;
                }
            }
            this.isDate = true;
            this.newData = data;
        }
    }

    closeSidenav(): void {
        this.resetDateForm();
        this.drawer.toggle();
    }

    onToggleClick(floor): void {
        this.unblockFloors.includes(floor)
            ? this.unblockFloors.splice(this.unblockFloors.indexOf(floor), 1)
            : this.unblockFloors.push(floor);
        this.unblockFloors.length === 0
            ? (this.isButton = true)
            : (this.isButton = false);
    }

    unblockFacility(reload): void {
        this.loading = true;
        const reqId: EditBlockFacilityParams = { id: this.isFloorBlocked.id };
        const unblockdata: BlockFacilityPayload = {
            data: {
                facilityId: this.isFloorBlocked.data.facilityId,
                floors: this.unblockFloors,
            },
            fromDate: formatDate(this.isFloorBlocked.fromDate),
            toDate:
                this.isFloorBlocked.toDate === 'Indefinite range'
                    ? INDEFINITE_DATE
                    : formatDate(this.isFloorBlocked.toDate),
        };
        this.blockService
            .unblockFacility(unblockdata, reqId)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(
                (res: BlockFacilityResponse) => {
                    this.showNotification.openSnackBar(res?.data?.message);
                    this.loading = false;
                    reload.getBlockHistory(
                        this.getBlockHistoryRequiredParams()
                    );
                    this.closeSidenav();
                },
                (_error: HttpErrorResponse) => {
                    this.loading = false;
                    this.showNotification.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                    reload.getBlockHistory(
                        this.getBlockHistoryRequiredParams()
                    );
                    this.closeSidenav();
                    this.showNotification.openSnackBar(
                        ErrorMessageUtil.getErrorMessage(_error)
                    );
                }
            );
    }

    private getBlockHistoryRequiredParams(): BlockHistoryParams {
        return {
            offset: '0',
            limit: '31',
            month: (
                moment(this.isFloorBlocked.fromDate).month() + 1
            ).toString(),
            year: moment(this.isFloorBlocked.fromDate)
                .year()
                .toString(),
        };
    }
}
