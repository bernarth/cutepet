import { Component, input } from '@angular/core';

@Component({
  selector: 'cp-page-header',
  template: `
    <h1>{{ title() }}</h1>
    @if (subtitle(); as text) {
      <p>{{ text }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--cp-space-lg);
    }
    h1 {
      font-family: var(--cp-font-display);
      margin: 0 0 var(--cp-space-xs);
    }
    p {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
