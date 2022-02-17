import { SideNavItem } from './side-nav-item.model';

export const sideNavItems: SideNavItem[] = [
    {
        displayName: 'Book a seat',
        route: 'booking',
        expanded: false,
        id: 'home',
        icon: {
            name: 'home',
            align: 'left',
        },
    },
    {
        displayName: 'Book a visit',
        route: 'visitBookingRequest',
        expanded: false,
        id: 'visitBookingRequest',
        icon: {
            name: 'perm_contact_calendar',
            align: 'left',
        },
    },
    {
        displayName: 'Booking History',
        route: 'bookingHistory',
        expanded: false,
        id: 'bookingHistory',
        icon: {
            name: 'history',
            align: 'left',
        },
    },
];

export const managerLevelSideNavItems: SideNavItem[] = [
    {
        displayName: 'Book a seat',
        route: 'booking',
        expanded: false,
        id: 'home',
        icon: {
            name: 'home',
            align: 'left',
        },
    },
    {
        displayName: 'Book a visit',
        route: 'visitBookingRequest',
        expanded: false,
        id: 'visitBookingRequest',
        icon: {
            name: 'perm_contact_calendar',
            align: 'left',
        },
    },
    {
        displayName: 'Pending Requests',
        route: 'pendingRequests',
        expanded: false,
        id: 'pendingRequests',
        icon: {
            name: 'pending',
            align: 'left',
        },
    },
    {
        displayName: 'Booking History',
        route: 'bookingHistory',
        expanded: false,
        id: 'bookingHistory',
        icon: {
            name: 'history',
            align: 'left',
        },
    },
];

export const adminSideNavItems: SideNavItem[] = [
    {
        displayName: 'Book a seat',
        route: 'booking',
        expanded: false,
        id: 'home',
        icon: {
            name: 'home',
            align: 'left',
        },
    },
    {
        displayName: 'Book a visit',
        route: 'visitBookingRequest',
        expanded: false,
        id: 'visitBookingRequest',
        icon: {
            name: 'perm_contact_calendar',
            align: 'left',
        },
    },
    {
        displayName: 'Booking History',
        route: 'bookingHistory',
        expanded: false,
        id: 'bookingHistory',
        icon: {
            name: 'history',
            align: 'left',
        },
    },
    {
        displayName: 'Pending Requests',
        route: 'admin/pendingRequests',
        expanded: false,
        id: 'pendingRequests',
        icon: {
            name: 'pending',
            align: 'left',
        },
    },
    {
        displayName: 'Reports',
        route: 'admin/reports',
        expanded: false,
        icon: {
            name: 'assignment',
            align: 'left',
        },
    },
];

export const superAdminSideNavItems: SideNavItem[] = [
    {
        displayName: 'Pending Requests',
        route: 'admin/pendingRequests',
        expanded: false,
        id: 'pendingRequests',
        icon: {
            name: 'pending',
            align: 'left',
        },
    },
    {
        displayName: 'Book a seat',
        route: 'booking',
        expanded: false,
        id: 'home',
        icon: {
            name: 'home',
            align: 'left',
        },
    },
    {
        displayName: 'Book a visit',
        route: 'visitBookingRequest',
        expanded: false,
        id: 'visitBookingRequest',
        icon: {
            name: 'perm_contact_calendar',
            align: 'left',
        },
    },
    {
        displayName: 'Booking History',
        route: 'bookingHistory',
        expanded: false,
        id: 'bookingHistory',
        icon: {
            name: 'history',
            align: 'left',
        },
    },
    {
        displayName: 'Reports',
        route: 'admin/reports',
        expanded: false,
        icon: {
            name: 'assignment',
            align: 'left',
        },
    },
    {
        displayName: 'Block Facility',
        route: 'admin/block',
        expanded: false,
        icon: {
            name: 'do_not_disturb',
            align: 'left',
        },
    },
    {
        displayName: 'Unblock Facility',
        route: 'admin/unblock',
        expanded: false,
        icon: {
            name: 'date_range',
            align: 'left',
        },
    },
    {
        displayName: 'Delegations',
        route: 'admin/delegation',
        expanded: false,
        icon: {
            name: 'admin_panel_settings',
            align: 'left',
        },
    },
    {
        displayName: 'Manage Seats',
        route: 'admin/manageSeats',
        expanded: false,
        icon: {
            name: 'settings',
            align: 'left',
        },
    },
];

export const BlockUnblockSidenavItem: SideNavItem[] = [
    {
        displayName: 'Block Facility',
        route: 'admin/block',
        expanded: false,
        icon: {
            name: 'do_not_disturb',
            align: 'left',
        },
    },
    {
        displayName: 'Unblock Facility',
        route: 'admin/unblock',
        expanded: false,
        icon: {
            name: 'date_range',
            align: 'left',
        },
    },
    {
        displayName: 'Manage Seats',
        route: 'admin/manageSeats',
        expanded: false,
        icon: {
            name: 'settings',
            align: 'left',
        },
    },
];
