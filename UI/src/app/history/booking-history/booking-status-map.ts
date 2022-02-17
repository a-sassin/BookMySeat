const pendingStyle = 'color: #e9a318;font-weight: 500';
const approvedStyle = 'color: #06a125;font-weight: 500';
const cancelledStyle = 'color: #c40000;font-weight: 500';
const rejectedStyle = 'color: #c40000;font-weight: 500';

export enum BookingRequestStatuses {
    PENDING_L1 = 'Pending On Manager',
    PENDING_L2 = 'Pending On Admin',
    REJECTED_L1 = 'Rejected By Manager',
    REJECTED_L2 = 'Rejected By Admin',
    PENDING = 'Pending',
    REJECTED = 'Rejected',
    APPROVED = 'Approved',
    CANCELLED = 'Cancelled',
    AUTO_CANCELLED = 'Auto Cancelled',
}

export const BOOKING_STATUS_STYLES = {
    'PENDING-L1': pendingStyle,
    'PENDING-L2': pendingStyle,
    'REJECTED-L1': rejectedStyle,
    'REJECTED-L2': rejectedStyle,
    PENDING: pendingStyle,
    REJECTED: rejectedStyle,
    APPROVED: approvedStyle,
    CANCELLED: cancelledStyle,
    'AUTO-CANCELLED': cancelledStyle,
};

export const BOOKING_STATUS_MAP = {
    'PENDING-L1': BookingRequestStatuses.PENDING_L1,
    'PENDING-L2': BookingRequestStatuses.PENDING_L2,
    'REJECTED-L1': BookingRequestStatuses.REJECTED_L1,
    'REJECTED-L2': BookingRequestStatuses.REJECTED_L2,
    PENDING: BookingRequestStatuses.PENDING,
    REJECTED: BookingRequestStatuses.REJECTED,
    APPROVED: BookingRequestStatuses.APPROVED,
    CANCELLED: BookingRequestStatuses.CANCELLED,
    'AUTO-CANCELLED': BookingRequestStatuses.AUTO_CANCELLED,
};
