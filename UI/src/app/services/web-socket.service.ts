import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../util/constants';
import { UserService } from './user.service';
import { environment } from '../../environments/environment';
@Injectable({
    providedIn: 'root',
})
export class WebSocketService {
    private socketUrl: string = environment?.socketUrl;
    private socket;

    constructor(private readonly userService: UserService) {}

    listen() {
        if (!this.socket?.connected) {
            this.initSocket();
        }

        return new Observable(observer => {
            this.socket.on(
                SOCKET_EVENTS.PENDING,
                data => observer.next(data.notificationCount),
                error => console.error(error)
            );
        });
    }

    emit(eventName, data): void {
        this.socket.emit(eventName, data);
    }

    disconnect(): void {
        this.socket.disconnect();
    }
    private initSocket() {
        const token = this.userService.getUserSessionData()?.token;
        const authToken = `Bearer ${token}`;
        this.socket = io(this.socketUrl, {
            path: '/notifications',
            auth: {
                authToken,
            },
        });
    }
}
