import { BookingRequestStatuses } from './pending-approval-component.model';
import { SelectedSeat } from './booking-component.model';

export interface PaginationModel {
    limit: number;
    offset: number;
    total: number;
    count: number;
}

export interface BookingHistoryResponse {
    status: number;
    data: BookingHistoryData[];
    pagination: PaginationModel;
}

export interface BookingHistoryData {
    currentStatus: BookingRequestStatuses;
    isL1Required: boolean;
    empId: string;
    practice: string;
    facilityId: string;
    facilityName: string;
    floorNo: number;
    floorId: string;
    selectedSeats: SelectedSeat[];
    fromDate: string;
    toDate: string;
    requestSummary: string;
    L1Approver: string;
    title: string;
    requestId: string;
    rejectionReason?: string;
    cancelledDates: [];
    blockedDates: [];
}

export interface CancelRequestParams {
    requestId: string;
    action: string;
}

export interface BookingHistoryParams {
    requesterId: string;
    offset?: string;
    limit?: string;
    currentStatus?: string;
    fromDate?: string;
    date?: string;
    orderBy?: string;
    sortOrder?: string;
}

export interface CancelBookingResponse {
    message: string;
    requestId: string;
    status: number;
}

export interface VisitBookingHistoryResponse {
    status: number;
    data: VisitBookingHistoryData[];
    pagination: PaginationModel;
}
export interface VisitBookingHistoryData {
    currentStatus: BookingRequestStatuses;
    empId: string;
    date: string;
    requestSummary: string;
    requestId: string;
    category: string;
    concernedEmpName: string;
    practice: string;
    vaccinationStatus: boolean;
}
