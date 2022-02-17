import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-block',
    templateUrl: './block.component.html',
    styleUrls: ['./block.component.scss'],
})
export class BlockComponent implements OnInit {
    selectedIndex = 0;
    constructor() {}

    ngOnInit(): void {}
}
