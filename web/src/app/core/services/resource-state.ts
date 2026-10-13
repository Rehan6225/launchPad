import { signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

/**
 * Minimal signal-based async state container: data + loading + error.
 * Keeps every feature consistent about loading / error / empty states.
 */
export class ResourceState<T> {
  readonly data = signal<T | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loaded = signal(false);

  track(source: Observable<T>): Observable<T> {
    this.loading.set(true);
    this.error.set(null);
    return source.pipe(
      tap({
        next: (value) => {
          this.data.set(value);
          this.loaded.set(true);
        },
        error: (err: Error) => this.error.set(err.message),
      }),
      finalize(() => this.loading.set(false)),
    );
  }
}
