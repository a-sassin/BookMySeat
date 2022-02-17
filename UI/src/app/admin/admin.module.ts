import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material/material.module';
import { AdminRoutingModule } from './admin-routing.module';
// import { UnblockFacilityComponent } from './unblock-facility/unblock-facility.component';
// import { UnblockComponent } from './unblock/unblock.component';
// import { DelegationsComponent } from './delegations/delegations.component';

// import { DetailedReportComponent } from './reports/detailed-report/detailed-report.component';
// import { FloorCardsComponent } from './reports/floor-cards/floor-cards.component';
// import { ReportsComponent } from './reports/reports.component';
// import { BlockHistoryComponent } from './block/block-history/block-history.component';
// import { BlockFacilityComponent } from './blocking/block-facility/block-facility.component';
// import { RequestsComponent } from './requests/requests.component';

@NgModule({
    declarations: [], // #TODO add all components of admin inside admin module
    imports: [CommonModule, MaterialModule, AdminRoutingModule],
})
export class AdminModule {}
