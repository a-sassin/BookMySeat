import { OnInit, Component, Input } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { BookingRequestStatuses } from 'src/app/history/booking-history/booking-status-map';
import { ProgressBarDetails } from '../custom-progress-bar/custom-progress-bar.component';

@Component({
    selector: 'app-booking-details',
    templateUrl: './booking-details.component.html',
    styleUrls: ['./booking-details.component.scss'],
})
export class BookingDetailsComponent implements OnInit {
    @Input() rowDetails: any = {};

    @Input() progressBarDetails: ProgressBarDetails;

    showProgressbar: Boolean;
    isNotSubordinatesSlide = true;

    constructor(
        private readonly iconRegistry: MatIconRegistry,
        private readonly sanitizer: DomSanitizer
    ) {
        this.iconRegistry.addSvgIcon(
            'perm_identity',
            this.sanitizer.bypassSecurityTrustResourceUrl(
                'assets/perm_identity.svg'
            )
        );
    }

    ngOnInit() {
        this.initShowProgressBar();
    }

    onSlideChange(): void {
        this.isNotSubordinatesSlide = !this.isNotSubordinatesSlide;
    }

    private initShowProgressBar(): void {
        this.showProgressbar =
            this.rowDetails?.status === BookingRequestStatuses.PENDING_L1 ||
            this.rowDetails?.status === BookingRequestStatuses.PENDING_L2 ||
            this.rowDetails?.status === BookingRequestStatuses.APPROVED;
    }
}
