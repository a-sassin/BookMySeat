import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BookingComponent } from './booking/booking.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login/login.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MaterialModule } from './material/material.module';
import { HttpClientModule } from '@angular/common/http';
import { HeaderComponent } from './header/header.component';
import { SideNavItemModule } from './side-nav-item/side-nav-item.module';

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthHttpInterceptor } from './services/auth.http.interceptor.service';
import { LogoutComponent } from './logout/logout.component';
import { ConfirmationComponent } from './confirmation/confirmation.component';
import { TableComponent } from './common-component/table-component/table.component';
import { RequestsComponent } from './requests/requests.component';
import { PendingApprovalComponent } from './requests/pending-approval/pending-approval.component';
import { DialogComponent } from './common-component/dialog-component/dialog.component';
import { BookingDetailsComponent } from './common-component/booking-details/booking-details.component';
import { CustomProgressBarComponent } from './common-component/custom-progress-bar/custom-progress-bar.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { BlockComponent } from './admin/block/block.component';
import { BlockFacilityComponent } from './admin/block/block-facility/block-facility.component';
import { BlockHistoryComponent } from './admin/block/block-history/block-history.component';
import { ReportsComponent } from './admin/reports/reports.component';
import { FloorCardsComponent } from './admin/reports/floor-cards/floor-cards.component';
import { DetailedReportComponent } from './admin/reports/detailed-report/detailed-report.component';
import { UnblockFacilityComponent } from './admin/unblock-facility/unblock-facility.component';
import { UnblockComponent } from './admin/unblock/unblock.component';
import { DelegationsComponent } from './admin/delegations/delegations.component';
import { HistoryComponent } from './history/history.component';
import { BookingHistoryComponent } from './history/booking-history/booking-history.component';
import { VisitBookingHistoryComponent } from './history/visit-booking-history/visit-booking-history.component';
import { VisitBookingRequestComponent } from './requests/visit-booking-request/visit-booking-request.component';
import { VisitBookingComponent } from './visit-booking/visit-booking.component';
import { VisitConfirmationComponent } from './confirmation/visit-confirmation/visit-confirmation.component';
import { VisitReportComponent } from './admin/reports/visit-report/visit-report.component';
import { ManageSeatBookingComponent } from './admin/manage-seat-booking/manage-seat-booking.component';

@NgModule({
    declarations: [
        AppComponent,
        BookingComponent,
        LoginComponent,
        HeaderComponent,
        LogoutComponent,
        ConfirmationComponent,
        TableComponent,
        RequestsComponent,
        PendingApprovalComponent,
        BookingHistoryComponent,
        DialogComponent,
        BookingDetailsComponent,
        CustomProgressBarComponent,
        PageNotFoundComponent,
        BlockComponent, // move to admin module
        BlockFacilityComponent, // move to admin module
        BlockHistoryComponent, // move to admin module
        ReportsComponent, // move to admin  module
        FloorCardsComponent, // move to admin  module
        DetailedReportComponent, // move to admin module
        UnblockFacilityComponent,
        UnblockComponent,
        ManageSeatBookingComponent,
        DelegationsComponent,
        HistoryComponent,
        VisitBookingHistoryComponent,
        VisitBookingRequestComponent,
        VisitBookingComponent,
        VisitConfirmationComponent,
        VisitReportComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MaterialModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        SideNavItemModule,
    ],
    providers: [
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthHttpInterceptor,
            multi: true,
        },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
