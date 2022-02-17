import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
    BookSeatRequestPayload,
    BookSeatResponse,
    FloorPlanRequestParams,
    FloorPlanResponse,
    VisitBookingRequestPayLoad,
    VisitBookResponse,
} from '../models/booking-component.model';
import {
    BookingActionResponse,
    BookingActionPayload,
    PendingApprovalResponse,
    PendingApprovalsParams,
    VisitPendingApprovalResponse,
} from '../models/pending-approval-component.model';
import {
    BookingHistoryResponse,
    CancelRequestParams,
    CancelBookingResponse,
    BookingHistoryParams,
    VisitBookingHistoryResponse,
} from '../models/booking-history-component.model';
@Injectable({
    providedIn: 'root',
})
export class BookingService {
    constructor(private http: HttpClient) {}
    baseUrl = environment.baseUrl;

    getFloorPlan(
        getFloorParams: FloorPlanRequestParams
    ): Observable<FloorPlanResponse> {
        const params = new HttpParams({ fromObject: { ...getFloorParams } });

        return this.http.get<FloorPlanResponse>(`${this.baseUrl}floor-plan`, {
            params,
        });
    }

    bookSeat(
        bookingData: BookSeatRequestPayload
    ): Observable<BookSeatResponse> {
        return this.http.post<BookSeatResponse>(
            `${this.baseUrl}book-seats`,
            bookingData
        );
    }

    getPendingApprovals(
        pendingApprovalsParams: PendingApprovalsParams
    ): Observable<PendingApprovalResponse> {
        const params = new HttpParams({
            fromObject: { ...pendingApprovalsParams },
        });

        return this.http.get<PendingApprovalResponse>(
            `${this.baseUrl}book-seats/approvalBookings`,
            {
                params,
            }
        );
    }
    //get visit pending approval
    getVisitPendingApprovals(
        pendingApprovalsParams: PendingApprovalsParams
    ): Observable<VisitPendingApprovalResponse> {
        const params = new HttpParams({
            fromObject: { ...pendingApprovalsParams },
        });

        return this.http.get<VisitPendingApprovalResponse>(
            `${this.baseUrl}visits/pending-approval`,
            {
                params,
            }
        );
    }

    // this will approve and reject booking requests (L1 & L2)
    actionOnBookingRequest(
        actionPayload: BookingActionPayload
    ): Observable<BookingActionResponse> {
        return this.http.post<BookingActionResponse>(
            `${this.baseUrl}book-seats/actionOnBookings`,
            actionPayload
        );
    }

    // this will approve and reject visit booking request (L2)
    actionOnVisitBookingRequest(
        actionPayload: BookingActionPayload
    ): Observable<BookingActionResponse> {
        return this.http.post<BookingActionResponse>(
            `${this.baseUrl}visits/action`,
            actionPayload
        );
    }

    getBookingHistory(
        bookingHistoryParams: BookingHistoryParams
    ): Observable<BookingHistoryResponse> {
        const params = new HttpParams({
            fromObject: { ...bookingHistoryParams },
        });

        return this.http.get<BookingHistoryResponse>(
            `${this.baseUrl}book-seats/bookings`,
            { params }
        );
    }
    // get visit booking history
    getVisitBookingHistory(
        bookingHistoryParams: BookingHistoryParams
    ): Observable<VisitBookingHistoryResponse> {
        const params = new HttpParams({
            fromObject: { ...bookingHistoryParams },
        });

        return this.http.get<VisitBookingHistoryResponse>(
            `${this.baseUrl}visits/bookings`,
            { params }
        );
    }

    cancelRequest(
        params: CancelRequestParams
    ): Observable<CancelBookingResponse> {
        return this.http.post<CancelBookingResponse>(
            `${this.baseUrl}book-seats/bookings/cancel`,
            params
        );
    }

    visitBook(
        visitbookingData: VisitBookingRequestPayLoad
    ): Observable<VisitBookResponse> {
        return this.http.post<VisitBookResponse>(
            `${this.baseUrl}visits`,
            visitbookingData
        );
    }
}
