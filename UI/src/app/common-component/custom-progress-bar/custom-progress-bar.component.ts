import { OnInit, Component, Input } from '@angular/core';
import { UserService } from 'src/app/services/user.service';

declare type ProgressText =
    | 'Request Submitted'
    | 'Managers Approval'
    | 'Admins Approval'
    | 'Approved';

declare type ApprovalLevel = 'Multiple' | 'Single';

export interface ProgressBarDetails {
    statusText: ProgressText[];
    progressAtStep: Number;
}

@Component({
    selector: 'app-custom-progress-bar',
    templateUrl: './custom-progress-bar.component.html',
    styleUrls: ['./custom-progress-bar.component.scss'],
})
export class CustomProgressBarComponent implements OnInit {
    @Input() progressData: ProgressBarDetails;
    @Input() rowDetails: any = {};

    approvalType: ApprovalLevel;

    constructor(private readonly userService: UserService) {}

    ngOnInit() {}
}
