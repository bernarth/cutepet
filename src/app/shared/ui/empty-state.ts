import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'cp-empty-state',
  imports: [MatIconModule],
  template: `
    <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
    <p>{{ message() }}</p>
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--cp-space-sm);
      padding: var(--cp-space-xl) var(--cp-space-md);
      text-align: center;
      border: var(--cp-border);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-low);
    }
    mat-icon {
      transform: scale(1.5);
    }
  `,
})
export class EmptyState {
  readonly message = input.required<string>();
  readonly icon = input('pets');
}
