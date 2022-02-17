import { MatSelect } from '@angular/material/select';

declare type CellContent =
    | 'text'
    | 'number'
    | 'link'
    | 'class'
    | 'button'
    | 'classIcon';

declare type ButtonColor = 'primary' | 'accent' | 'warn';

export interface IconClass {
    value: any;
    class: string;
    alt?: string;
    style?: string;
}

export interface ButtonProperties {
    value: string;
    buttonText: string;
    style?: string;
    color?: ButtonColor;
    disableButton?: boolean;
}

export interface TableProperties {
    fieldName: string; // the key name whose value is to be rendered and value should be similar to the displayedColumns array value
    headerName?: string; // header name or column name
    cellContent?: CellContent; // type of value cell will contain
    iconClass?: IconClass[];
    buttonProperties?: ButtonProperties[];
    allowLinkDisabling?: boolean;
    dynamicStyleField?: string;
}

export interface FilterOptions {
    label: string;
    inputType: string;
    minDate?: string;
    maxDate?: string;
    selectOptions?: SelectOptions[];
}

export interface SelectOptions {
    displayValue: string;
    value: string;
}

export interface StatusFilterEvent {
    source: MatSelect;
    value: string;
}

export interface ResetFilterEvent {
    value: string;
}
