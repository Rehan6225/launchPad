import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MockBackend } from '../data/mock-backend';

/**
 * Single entry point for data access. Routes to the in-memory mock backend
 * or the Express API depending on `environment.useMock`.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private mock = inject(MockBackend);

  get<T>(path: string): Observable<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.request<T>('DELETE', path);
  }

  private request<T>(method: string, path: string, body?: unknown): Observable<T> {
    const source = environment.useMock
      ? this.mock.handle<T>(method, path, body)
      : this.http.request<T>(method, `${environment.apiUrl}/${path.replace(/^\/+/, '')}`, {
          body,
        });

    return source.pipe(catchError((err) => throwError(() => new Error(toMessage(err)))));
  }
}

function toMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the API. Is the server running?';
    return err.error?.message || `Request failed (${err.status}).`;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
