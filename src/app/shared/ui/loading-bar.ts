import { Component, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/**
 * @description Always takes the same height, so showing or hiding it never moves the page
 */
@Component({
  selector: 'cp-loading-bar',
  imports: [MatProgressBarModule],
  template: `
    @if (active()) {
      <mat-progress-bar mode="indeterminate" [attr.aria-label]="label()" />
    }
  `,
  styles: `
    :host {
      display: block;
      height: 4px;
      margin-bottom: var(--cp-space-sm);
    }
  `,
})
export class LoadingBar {
  readonly active = input(false);
  readonly label = input('Cargando');
}
