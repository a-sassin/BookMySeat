import { Seat } from './booking-component.model';

export interface DownloadReportRequestParams {
    facilityId: string;
    floorNo: string;
    bookingDate: string;
}

export interface DownloadVisitReportRequestParams {
    date: string;
}

export interface ReportSummaryRequestParams {
    facilityId: string;
    queryDate: string;
    floorNo?: string;
}

export interface VisitReportSummaryRequestParams {
    date: string;
}

export interface ReportSummaryResponse {
    status: number;
    data: ReportSummaryData[];
}

export interface ReportSummaryDetailsResponse {
    status: number;
    data: ReportSummaryDetailData[];
}

interface ReportSummaryDetailData {
    bookedBy: string;
    bookedByName: string;
    seatNo: number;
    bookedFor: string;
    bookedForName: string;
}

export interface VisitReportSummaryResponse {
    status: number;
    data: VisitReportSummaryData[];
}

interface ReportSummaryData {
    bookedSeatsCount: number;
    facilityId: string;
    floorNo: string;
    seats: Seat[];
    totalSeatsCount: string;
}

interface VisitReportSummaryData {
    concernedEmpName: string;
    empId: string;
    category: string;
}

export interface EmployeeList {
    email?: string;
    empId: string;
    name: string;
    self?: boolean;
}
export interface EmployeeListRes {
    status: number;
    data: EmployeeList[];
}

export interface FacilityAdminsListRes {
    status: number;
    facilityAdmins: FacilityAdminsList[];
}
export interface FacilityAdminsList {
    name: string;
    empId: string;
    email: string;
    isSuperAdmin: boolean;
    createdBy?: String;
    createdAt: string;
    assignedPractices?: String[];
    roles?: String[];
}
export interface delegateEmployeeRes {
    status: number;
    message: string;
}

export interface DelegateEmployeePayload {
    empId: string;
    practices: string[];
}

export interface RemoveFacilityAdminRes {
    status: number;
    message: string;
}

export interface updateFloorMapPayload {
    floorNo: string;
    facilityId: string;
    date: string;
    seatsToBeChanged: Seats[];
}

export interface Seats {
    seatNo: string;
    status: string;
}

export interface updateFloorMapRes {
    status: number;
    message: string;
}
