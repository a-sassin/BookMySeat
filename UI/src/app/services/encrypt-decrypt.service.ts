import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class EncryptDecryptService {
    constructor() {}
    encrypt(data) {
        try {
            return CryptoJS.AES.encrypt(
                data,
                environment.encryptionKey
            ).toString();
        } catch (e) {
            console.log(e);
        }
    }

    decrypt(data) {
        try {
            const bytes = CryptoJS.AES.decrypt(data, environment.encryptionKey);
            JSON.parse(bytes.toString(CryptoJS.enc.Utf8)); //handled if there is error in JSON.parse then it will be taken in care by catch
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            console.error(e);
            return 'Error'; // Malformed UTF error occurs if encrypted localstorage data is tampered,
            // to avoid app from getting crashed, handled this way
        }
    }
}
