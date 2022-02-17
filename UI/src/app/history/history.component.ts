import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-history',
    templateUrl: './history.component.html',
    styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
    selectedIndex = 0;
    showSeatHistory: boolean;
    constructor(private route: ActivatedRoute, private router: Router) {}
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();

    ngOnInit(): void {
        this.route.queryParams
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(params => {
                if (params.check === 'visitBookingHistory') {
                    this.selectedIndex = 1;
                }
            });
    }
    ngOnDestroy(): void {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    onTabChange(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
        });
    }
}
