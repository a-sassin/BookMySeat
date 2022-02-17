import { SelectedSeat } from './booking-component.model';

export declare type ApprovalActions = 'approve' | 'reject';

export declare type BookingRequestStatuses =
    | 'pending-L1'
    | 'pending-L2'
    | 'rejected-L1'
    | 'rejected-L2'
    | 'pending'
    | 'rejected'
    | 'approved'
    | 'cancelled'
    | 'auto-cancelled';

export interface PendingApprovalResponse {
    status: number;
    data: PendingApprovalData[];
    pagination: PaginationModel;
}

export interface PendingApprovalData {
    currentStatus: BookingRequestStatuses;
    isL1Required: boolean;
    empId: string;
    bookedByName: string;
    practice: string;
    facilityName: string;
    facilityId: string;
    floorNo: number;
    floorId: string;
    selectedSeats: SelectedSeat[];
    fromDate: string;
    toDate: string;
    requestSummary: string;
    L1Approver: string;
    title: string;
    requestId: string;
    vaccinationStatus: boolean;
}
export interface PaginationModel {
    limit: number;
    offset: number;
    total: number;
    count: number;
}
// TODO there is a change in actionpayload
export interface BookingActionPayload {
    requestId: string;
    action: string;
    rejectionReason?: string;
}
// this needs to remove

export interface BookingActionResponse {
    status: number;
    message: string;
    requestId?: string;
}

export interface PendingApprovalListItem {
    empId?: string;
    requestId: string;
    seatNumber: string[];
    date: string;
    bookedBy: string;
    reason: string;
    subordinates?: SelectedSeat[];
    bookedFor?: string;
    practice: string;
}

export interface ActionClickedEvent {
    buttonClicked: ApprovalActions;
    row: PendingApprovalListItem;
}
export interface PendingApprovalsParams {
    approverId: string;
    offset: string;
    limit: string;
    date?: string;
    orderBy?: string;
    sortOrder?: string;
}

export interface VisitPendingApprovalListItem {
    employeeId: string;
    requestId: string;
    bookedByName: string;
    date: string;
    reason: string;
    practice?: string;
    category: string;
    concernedEmployee: string;
}
export interface VisitPendingApprovalResponse {
    status: number;
    data: VisitPendingApprovalData[];
    pagination: PaginationModel;
}
export interface VisitPendingApprovalData {
    empId: string;
    bookedByName: string;
    date: string;
    requestSummary: string;
    requestId: string;
    category: string;
    concernedEmpName: string;
    practice?: string;
    vaccinationStatus: boolean;
}
