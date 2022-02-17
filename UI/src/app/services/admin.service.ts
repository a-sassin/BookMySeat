import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
    DelegateEmployeePayload,
    delegateEmployeeRes,
    DownloadReportRequestParams,
    EmployeeListRes,
    FacilityAdminsListRes,
    RemoveFacilityAdminRes,
    ReportSummaryRequestParams,
    DownloadVisitReportRequestParams,
    VisitReportSummaryRequestParams,
    updateFloorMapPayload,
    updateFloorMapRes,
} from '../models/admin.model';

@Injectable({
    providedIn: 'root',
})
export class AdminService {
    constructor(private http: HttpClient) {}
    baseUrl = environment.baseUrl;

    downloadReport(
        getDownloadParams?: DownloadReportRequestParams
    ): Observable<Blob> {
        const params = new HttpParams({ fromObject: { ...getDownloadParams } });
        return this.http.get<Blob>(
            `${this.baseUrl}book-seats/bookings/download`,
            {
                params,
                responseType: 'blob' as any,
            }
        );
    }

    downloadVisitReport(
        getDownloadParams?: DownloadVisitReportRequestParams
    ): Observable<Blob> {
        const params = new HttpParams({ fromObject: { ...getDownloadParams } });
        return this.http.get<Blob>(`${this.baseUrl}visits/bookings/download`, {
            params,
            responseType: 'blob' as any,
        });
    }

    getReportSummary(
        getReportSummaryParams?: ReportSummaryRequestParams
    ): Observable<any> {
        const params = new HttpParams({
            fromObject: { ...getReportSummaryParams },
        });
        return this.http.get<any>(
            `${this.baseUrl}floor-plan/approvedSeatsSummary`,
            {
                params,
            }
        );
    }

    getReportSummaryDetails(
        getReportSummaryParams?: ReportSummaryRequestParams
    ): Observable<any> {
        console.log(getReportSummaryParams);
        return this.http.get<any>(
            `${this.baseUrl}floor-plan/approvedSeatsSummaryDetails/${getReportSummaryParams.facilityId}/${getReportSummaryParams.floorNo}/${getReportSummaryParams.queryDate}`
        );
    }

    getVisitReportSummary(
        getReportSummaryParams?: VisitReportSummaryRequestParams
    ): Observable<any> {
        const params = new HttpParams({
            fromObject: { ...getReportSummaryParams },
        });
        return this.http.get<any>(
            `${this.baseUrl}/visits/approvedVisitSummary`,
            {
                params,
            }
        );
    }

    // ---Roles and Access--
    getEmployees(searchDetails: any): Observable<EmployeeListRes> {
        return this.http.get<EmployeeListRes>(`${this.baseUrl}getEmployees`, {
            params: searchDetails,
        });
    }
    listFacilityAdmins(): Observable<FacilityAdminsListRes> {
        return this.http.get<FacilityAdminsListRes>(
            `${this.baseUrl}facilityAdmin`
        );
    }

    delegateEmployee(
        payload: DelegateEmployeePayload
    ): Observable<delegateEmployeeRes> {
        return this.http.put<delegateEmployeeRes>(
            `${this.baseUrl}facilityAdmin`,
            payload
        );
    }
    removeFacilityAdmin(
        facilityId: string
    ): Observable<RemoveFacilityAdminRes> {
        return this.http.delete<RemoveFacilityAdminRes>(
            `${this.baseUrl}facilityAdmin/${facilityId}`
        );
    }

    updateFloorMap(
        floorMapData: updateFloorMapPayload
    ): Observable<updateFloorMapRes> {
        return this.http.patch<delegateEmployeeRes>(
            `${this.baseUrl}floor-map`,
            floorMapData
        );
    }
}
