import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { UserService } from './services/user.service';
import {
    sideNavItems,
    adminSideNavItems,
    superAdminSideNavItems,
    managerLevelSideNavItems,
    BlockUnblockSidenavItem,
} from './side-nav-item/side-nav-items';
import { MatDrawer } from '@angular/material/sidenav';
import { ApprovalLevel } from './models/role';
import { RESPONSIBILTY_ASSIGN } from './util/constants';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
    title = 'book-seat';
    loggedIn = false;
    sideNavItems = [];
    selectedNavItemIndex = 0;
    @ViewChild('snav', { static: false }) sideNav: MatDrawer;

    constructor(private readonly userService: UserService) {}
    ngOnInit() {
        this.updateLoggedInStatus();
    }

    updateLoggedInStatus() {
        this.loggedIn = this.userService.getUserSessionData()?.token
            ? true
            : false;
    }

    ngAfterViewInit() {
        this.setNavBarItems();
        this.userService.userExist.subscribe(
            user => {
                this.updateLoggedInStatus();
                this.setNavBarItems();
                this.resetNavItemIndex();
            },
            error => {
                console.error(error);
            }
        );
    }

    toggleSidenav(event) {
        event === 'menu' ? this.sideNav.toggle() : this.sideNav.close();
    }

    itemExpanded($event, selectedMenuIndex) {
        if ($event) {
            $event.expanded = !$event.expanded;
            this.sideNav.toggle();
            this.selectedNavItemIndex = selectedMenuIndex;
        }
    }

    private resetNavItemIndex(): void {
        this.selectedNavItemIndex = 0;
    }

    private setNavBarItems(): void {
        if (!this.loggedIn) {
            return;
        }
        if (this.userService?.getUserSessionData()?.isSuperAdmin) {
            this.sideNavItems = [...superAdminSideNavItems];
        } else if (
            this.userService?.getUserSessionData()?.approvalLevel ===
                ApprovalLevel.l2 &&
            (this.userService
                ?.getUserSessionData()
                ?.roles.includes(RESPONSIBILTY_ASSIGN[0]) ||
                this.userService?.getUserSessionData()?.roles.length > 1)
        ) {
            this.sideNavItems = [
                ...adminSideNavItems,
                ...BlockUnblockSidenavItem,
            ];
        } else if (
            this.userService?.getUserSessionData()?.approvalLevel ===
                ApprovalLevel.l2 &&
            this.userService
                ?.getUserSessionData()
                ?.roles.includes(RESPONSIBILTY_ASSIGN[1])
        ) {
            this.sideNavItems = [...adminSideNavItems];
        } else if (
            this.userService?.getUserSessionData()?.hasSubordinates &&
            !this.userService?.getUserSessionData()?.isSuperAdmin
        ) {
            this.sideNavItems = [...managerLevelSideNavItems];
        } else {
            this.sideNavItems = [...sideNavItems];
        }
    }
}
