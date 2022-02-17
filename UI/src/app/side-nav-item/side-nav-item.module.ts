import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../material/material.module';
import { SideNavItemComponent } from './side-nav-item.component';

@NgModule({
    declarations: [SideNavItemComponent],
    imports: [CommonModule, RouterModule, MaterialModule],
    exports: [SideNavItemComponent],
})
export class SideNavItemModule {}
