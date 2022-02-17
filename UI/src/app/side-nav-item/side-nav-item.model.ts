export interface SideNavItem {
    displayName: string;
    route?: string;
    expanded?: boolean;
    id?: string;
    icon?: {
        name: string;
        align: string;
    };
}
