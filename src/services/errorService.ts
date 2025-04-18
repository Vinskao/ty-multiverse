import type { ErrorResponse } from '../types/error';

export class ErrorService {
  static handleError(error: any): void {
    if (this.isErrorResponse(error)) {
      this.showErrorMessage(error.message);
    } else {
      console.error('Unexpected error:', error);
      this.showErrorMessage('發生意外錯誤，請稍後重試。');
    }
  }

  private static isErrorResponse(error: any): error is ErrorResponse {
    return (
      error &&
      typeof error.code === 'number' &&
      typeof error.message === 'string' &&
      typeof error.detail === 'string'
    );
  }

  private static showErrorMessage(message: string): void {
    alert(message);
  }
} 