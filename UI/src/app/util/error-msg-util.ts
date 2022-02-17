import { HttpErrorResponse } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { ANONYMOUS_ERROR } from './constants';

export class ErrorMessageUtil {
    static getErrorMessage(error: HttpErrorResponse): string {
        let errorMessage = '';
        if (error.error) {
            errorMessage = `${error?.error.message}`;
        } else if (error.message) {
            errorMessage = `${error?.message}`;
        } else {
            errorMessage = ANONYMOUS_ERROR;
        }
        return errorMessage;
    }
}
export class MyErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(control: FormControl | null): boolean {
        return !!(
            control &&
            control.invalid &&
            (control.dirty || control.touched)
        );
    }
}

export function noWhitespaceValidator(
    control: FormControl
): { whitespace: boolean } {
    const isSpace = (control.value || '').startsWith(' ');
    return isSpace ? { whitespace: true } : null;
}
