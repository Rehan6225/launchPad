import { Injectable, computed, inject } from '@angular/core';
import { ReviewInsights } from '../models';
import { ApiService } from './api.service';
import { ResourceState } from './resource-state';

@Injectable({ providedIn: 'root' })
export class InsightsStore {
  private api = inject(ApiService);

  readonly state = new ResourceState<ReviewInsights>();
  readonly weeks = computed(() => this.state.data()?.weeks ?? []);
  readonly nextActions = computed(() => this.state.data()?.nextActions ?? []);

  load(force = true): void {
    if (this.state.loaded() && !force) return;
    this.state.track(this.api.get<ReviewInsights>('insights')).subscribe({ error: () => void 0 });
  }
}
