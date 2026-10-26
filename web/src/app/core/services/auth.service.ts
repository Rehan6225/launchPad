import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

const STORAGE_KEY = 'lp.token';

interface LoginResponse {
  token: string;
  username: string;
}

/** Holds the session token; the API is the source of truth for whether it's valid. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly token = signal<string | null>(readToken());
  readonly isLoggedIn = computed(() => !!this.token());

  login(username: string, password: string): Observable<LoginResponse> {
    return this.api
      .post<LoginResponse>('auth/login', { username, password })
      .pipe(tap((res) => this.setToken(res.token)));
  }

  logout(): void {
    this.setToken(null);
    this.router.navigateByUrl('/login');
  }

  private setToken(token: string | null): void {
    this.token.set(token);
    try {
      if (token) localStorage.setItem(STORAGE_KEY, token);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private mode) — session lasts until reload.
    }
  }
}

function readToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
