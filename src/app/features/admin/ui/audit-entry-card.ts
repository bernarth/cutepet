import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuditRow } from '../models/audit-row';
import { DateTimePipe } from './date-time.pipe';

@Component({
  selector: 'cp-audit-entry-card',
  imports: [RouterLink, DateTimePipe],
  template: `
    <div class="top">
      @if (row().link; as link) {
        <a class="title" [routerLink]="link">{{ row().title }}</a>
      } @else {
        <span class="title">{{ row().title }}</span>
      }
      <span class="action">{{ row().action }}</span>
    </div>
    <p class="meta">{{ row().at | dateTime }} · {{ row().actor }}</p>
    @if (row().changes.length > 0) {
      <ul class="changes">
        @for (change of row().changes; track change.label) {
          <li>
            {{ change.label }}: {{ change.before === null ? '' : change.before + ' → '
            }}{{ change.after }}
          </li>
        }
      </ul>
    }
    @if (row().reason) {
      <p class="reason">Motivo: {{ row().reason }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      padding: var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--cp-space-xs) var(--cp-space-sm);
    }
    .title {
      font: var(--mat-sys-title-small);
      color: inherit;
      overflow-wrap: anywhere;
    }
    .action,
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    p {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .changes {
      margin: 0;
      padding-left: var(--cp-space-md);
      overflow-wrap: anywhere;
    }
  `,
})
export class AuditEntryCard {
  readonly row = input.required<AuditRow>();
}
