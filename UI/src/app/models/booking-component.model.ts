export interface BookSeatRequestPayload {
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
    vaccinationStatus: string;
}

export interface VisitBookingRequestPayLoad {
    date: string;
    requestSummary: string;
    category: string;
    concernedEmpName: string;
    concernedEmpId: string;
    practice: string;
    vaccinationStatus: string;
}

export interface BookSeatResponse {
    status: string;
    data: BookSeatResponseData;
}

export interface VisitBookResponse {
    status: string;
    data: BookSeatResponseData;
}

export interface BookSeatResponseData {
    message: string;
    requestId: string;
}

export interface SelectedSeat {
    seatId: string;
    seatNo: string;
    bookedFor: string;
    bookedForName: string;
}

export interface FloorPlanRequestParams {
    floorNo: string;
    facilityId: string;
    fromDate: string;
    toDate: string;
}

export interface FloorPlanResponse {
    status: string;
    data: FloorData;
}

export interface FloorData {
    _id: string;
    floorId: string;
    assignedPractice: string;
    facilityName: string;
    facilityId: string;
    floorNo: number;
    indefiniteBlockingFromDate: string;
    listingData: FloorListingData[];
    createdAt: string;
    updatedAt: string;
    __v: number;
}

export interface FloorListingData {
    seats: Seat[];
    _id: string;
    listingDate: string;
    totalSeatsCount: number;
    availableSeatsCount: number;
    blockedSeatsCount: number;
    bookedSeatsCount: number;
    isFloorAvailableForBooking: boolean;
}

export interface Seat {
    status: string;
    _id: string;
    seatNo: number;
    coordinates: string;
    socialDistancingEnabled: boolean;
    seatId: string;
    bookedBy: string;
    bookedFrom: string | null;
    bookedTo: string | null;
    teamName?: string;
    bookedFor?: string;
    bookedForName?: string;
}

export interface FloorInfo {
    totalSeats: number;
    available: number;
    occupied: number;
    blocked: number;
}

export interface FloorDetails {
    floorNo: string;
    facilityId: string;
    displayValue: string;
    imagePath: string;
}

export interface SubordinateSeatsMapping {
    name: string;
    empId: string;
    seatNo?: string;
    seatId?: string;
    self?: boolean;
}
