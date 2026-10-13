import { Injectable, computed, inject } from '@angular/core';
import { Mission } from '../models';
import { ApiService } from './api.service';
import { ResourceState } from './resource-state';

@Injectable({ providedIn: 'root' })
export class MissionStore {
  private api = inject(ApiService);

  readonly state = new ResourceState<Mission>();
  readonly mission = computed(() => this.state.data());

  load(force = false): void {
    if (this.state.loaded() && !force) return;
    this.state.track(this.api.get<Mission>('mission')).subscribe({ error: () => void 0 });
  }
}
