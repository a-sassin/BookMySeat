import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { SideNavItem } from './side-nav-item.model';

@Component({
    selector: 'app-side-nav-item',
    templateUrl: './side-nav-item.component.html',
    styleUrls: ['./side-nav-item.component.scss'],
})
export class SideNavItemComponent implements OnInit {
    constructor() {}

    @Input() item: SideNavItem;
    @Output() itemExpanded = new EventEmitter();
    ngOnInit(): void {}

    onItemSelected($event) {
        this.itemExpanded.emit($event);
    }
}
