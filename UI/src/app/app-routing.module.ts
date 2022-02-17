import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BookingComponent } from './booking/booking.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './guards/auth.guard.service';
import { LogoutComponent } from './logout/logout.component';
import { ConfirmationComponent } from './confirmation/confirmation.component';
import { RequestsComponent } from './requests/requests.component';
import { AdminGuard } from './guards/admin.guard';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { BlockComponent } from './admin/block/block.component';
import { ReportsComponent } from './admin/reports/reports.component';
import { DetailedReportComponent } from './admin/reports/detailed-report/detailed-report.component';
import { UnblockComponent } from './admin/unblock/unblock.component';
import { DelegationsComponent } from './admin/delegations/delegations.component';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { HistoryComponent } from './history/history.component';
import { VisitBookingComponent } from './visit-booking/visit-booking.component';
import { VisitReportComponent } from './admin/reports/visit-report/visit-report.component';
import { RequestguardService } from './guards/requestguard.service';
import { ManageSeatBookingComponent } from './admin/manage-seat-booking/manage-seat-booking.component';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'booking',
        pathMatch: 'full',
    },
    {
        path: 'login',
        component: LoginComponent,
    },
    {
        path: 'logout',
        component: LogoutComponent,
    },
    {
        path: 'booking',
        component: BookingComponent,
        pathMatch: 'full',
        canActivate: [AuthGuard],
    },
    {
        path: 'booking/:bookingId',
        component: ConfirmationComponent,
        pathMatch: 'full',
        canActivate: [AuthGuard],
    },
    {
        path: 'pendingRequests',
        component: RequestsComponent,
        pathMatch: 'full',
        canActivate: [AuthGuard, SuperAdminGuard],
    },
    {
        path: 'bookingHistory',
        component: HistoryComponent,
        pathMatch: 'full',
        canActivate: [AuthGuard],
    },
    {
        path: 'visitBookingRequest',
        component: VisitBookingComponent,
        pathMatch: 'full',
        canActivate: [AuthGuard],
    },
    // TODO - This is temporary Fix for login into admin module
    // TODO - move all admin components routes to admin-routings.ts
    {
        path: 'admin/pendingRequests',
        pathMatch: 'full',
        canActivate: [AdminGuard],
        component: RequestsComponent,
        // loadChildren: () =>
        //   import(/* webpackChunkName: "admin-module" */ './admin/admin.module').then(
        //     (admin) => admin.AdminModule
        //   ),
    },
    {
        path: 'admin/block',
        pathMatch: 'full',
        canActivate: [AdminGuard, RequestguardService],
        component: BlockComponent,
    },
    {
        path: 'admin/unblock',
        pathMatch: 'full',
        canActivate: [AdminGuard, RequestguardService],
        component: UnblockComponent,
    },
    {
        path: 'admin/reports',
        pathMatch: 'full',
        canActivate: [AdminGuard],
        component: ReportsComponent,
    },
    {
        path: 'admin/reports/:facilityId/:floorId/:date',
        pathMatch: 'full',
        canActivate: [AdminGuard],
        component: DetailedReportComponent,
    },
    {
        path: 'admin/reports/visitapprovedsummary/:date',
        pathMatch: 'full',
        canActivate: [AdminGuard],
        component: VisitReportComponent,
    },
    {
        path: 'admin/delegation',
        pathMatch: 'full',
        canActivate: [AdminGuard, SuperAdminGuard],
        component: DelegationsComponent,
    },
    {
        path: 'admin/manageSeats',
        pathMatch: 'full',
        canActivate: [AdminGuard, RequestguardService],
        component: ManageSeatBookingComponent,
    },
    { path: 'not-found', component: PageNotFoundComponent },
    { path: '**', redirectTo: '/not-found' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
