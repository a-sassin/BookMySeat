import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
    EditBlockFacilityParams,
    BlockFacilityPayload,
    BlockFacilityResponse,
    BlockHistoryParams,
    BlockHistoryResponse,
} from '../models/block-facility.model';

@Injectable({
    providedIn: 'root',
})
export class BlockService {
    constructor(private http: HttpClient) {}
    baseUrl = environment.baseUrl;

    getBlockHistory(
        getBlockHistoryParams?: BlockHistoryParams
    ): Observable<BlockHistoryResponse> {
        const params = new HttpParams({
            fromObject: { ...getBlockHistoryParams },
        });
        return this.http.get<BlockHistoryResponse>(
            `${this.baseUrl}block-facility/history`,
            {
                params,
            }
        );
    }
    blockFacility(
        facilityDetails: BlockFacilityPayload
    ): Observable<BlockFacilityResponse> {
        return this.http.post<BlockFacilityResponse>(
            `${this.baseUrl}block-facility`,
            facilityDetails
        );
    }
    unblockFacility(
        facilityDetails: BlockFacilityPayload,
        reqId?: EditBlockFacilityParams
    ): Observable<BlockFacilityResponse> {
        const params = new HttpParams({ fromObject: { ...reqId } });
        return this.http.post<BlockFacilityResponse>(
            `${this.baseUrl}block-facility/unblock`,
            facilityDetails,
            {
                params,
            }
        );
    }

    editBlockFacility(
        editBlockFacilityParams: EditBlockFacilityParams,
        facilityDetails: BlockFacilityPayload
    ): Observable<BlockFacilityResponse> {
        const params = new HttpParams({
            fromObject: { ...editBlockFacilityParams },
        });
        return this.http.put<BlockFacilityResponse>(
            `${this.baseUrl}block-facility`,
            facilityDetails,
            {
                params,
            }
        );
    }
}
