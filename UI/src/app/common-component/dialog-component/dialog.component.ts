import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject, Optional, Component } from '@angular/core';
import { ProgressBarDetails } from '../custom-progress-bar/custom-progress-bar.component';
import * as moment from 'moment';
import { BookingRequestStatuses } from 'src/app/history/booking-history/booking-status-map';

declare type DialogType =
    | 'confirmation'
    | 'details'
    | 'confirm rejection'
    | 'status info';

declare type ButtonColor = 'primary' | 'basic';

export interface DialogProp {
    id?: string;
    width?: string;
    minHeight?: string;
    height?: string;
    data: DialogData;
    panelClass: string;
}

interface DialogData {
    dialogType: DialogType;
    closeButton?: boolean;
    title: string;
    message?: string;
    proceed?: boolean;
    textArea: boolean;
    textAreaPlaceholder?: string;
    buttonProp?: ButtonProp[];
    info?: any;
    progressBarData?: ProgressBarDetails;
    warningMessage?: string;
}

interface ButtonProp {
    buttonText: string;
    dialogCloseText: string;
    buttonValidation?: boolean;
    buttonColor: ButtonColor;
    style?: string;
}

@Component({
    selector: 'app-dialog',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
})
export class DialogComponent {
    showBlockedMssg: boolean;
    blockedDateRange: string[] = [];
    statusCancel: boolean;
    constructor(
        @Optional() public dialogRef: MatDialogRef<DialogComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: DialogData
    ) {
        this.showBlockedMssg = Boolean(data?.info?.blockedDates?.length);
        this.statusCancel =
            data?.info?.status === BookingRequestStatuses.CANCELLED;
        if (data?.info?.blockedDates?.length) {
            this.blockedDateRange = this.getDateRange(data?.info?.blockedDates);
        }
    }

    onSlideChange(): void {
        this.showBlockedMssg = !this.showBlockedMssg;
    }

    private getDateRange(datesArray, arr = []) {
        let i = 0;
        while (i < datesArray.length) {
            const dates = [];
            dates.push(datesArray[i]);
            for (
                let j = datesArray.indexOf(dates[dates.length - 1]) + 1;
                j > i;
                j++
            ) {
                if (
                    moment(dates[dates.length - 1])
                        .add(1, 'day')
                        .isSame(datesArray[j])
                ) {
                    dates.push(datesArray[j]);
                } else {
                    i = j;
                    dates.length > 1
                        ? arr.push(
                              `${moment(dates[0]).format('MMM D')} - ${moment(
                                  dates[dates.length - 1]
                              ).format('MMM D')}`
                          )
                        : arr.push(moment(dates[0]).format('MMM D'));
                    break;
                }
            }
        }
        return arr;
    }
}
