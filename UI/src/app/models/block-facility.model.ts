// Block History params and response
import { PaginationModel } from './booking-history-component.model';

export interface BlockHistoryParams {
    date?: string;
    orderBy?: string;
    sortOrder?: string;
    offset?: string;
    limit?: string;
    month?: string;
    year?: string;
}

export interface BlockHistoryResponse {
    status: number;
    data: BlockHistoryData[];
    pagination: PaginationModel;
}
export interface BlockHistoryData {
    facility: Facility;
    _id: string;
    id: string;
    fromDate: string;
    toDate: string;
    reason: string;
    blockedBy?: string;
    blockedByName?: string;
    _v: number;
}

export interface BlockHistoryListItem {
    fromDate: string;
    toDate: string;
    reason: string;
    id: string;
    building: string;
    floors: string[];
    blockedBy?: string;
    blockedByName?: string;
}

export interface Facility {
    facilityId: string;
    floors: string[];
}

//  Block facility payloads and response

export interface BlockFacilityResponse {
    status: string;
    data: {
        message: string;
        blockReqId?: number;
    };
}
export interface EditBlockFacilityParams {
    id?: string;
}
export interface BlockFacilityPayload {
    id?: string;
    fromDate: string;
    toDate: string;
    data: Facility;
    rejectionReason?: string;
}
export interface BlockFacilityActionClickedEvent {
    buttonClicked: Actions;
    row: BlockHistoryListItem;
}
export declare type Actions = 'unblock' | 'edit';
