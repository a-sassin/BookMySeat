import { Component, OnInit, Optional } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    selector: 'app-visit-confirmation',
    templateUrl: './visit-confirmation.component.html',
    styleUrls: ['./visit-confirmation.component.scss'],
})
export class VisitConfirmationComponent implements OnInit {
    constructor(
        private readonly router: Router,
        @Optional() public dialogRef: MatDialogRef<VisitConfirmationComponent>
    ) {}

    ngOnInit(): void {}

    onCheckStatus(): void {
        this.router.navigate(['/bookingHistory'], {
            queryParams: { check: 'visitBookingHistory' },
        });
        this.dialogRef.close();
    }

    onRedirectHome(): void {
        this.router.navigate(['/booking']);
        this.dialogRef.close();
    }
}
