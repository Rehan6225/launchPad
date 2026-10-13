import { Component } from '@angular/core';
import { ShellComponent } from './layout/shell/shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShellComponent],
  template: `<lp-shell />`,
})
export class AppComponent {}
