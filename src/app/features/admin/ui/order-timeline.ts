import { Component, input } from '@angular/core';

import { TimelineEvent } from '../models/order-timeline';
import { DateTimePipe } from '@core/dates/date-time.pipe';

@Component({
  selector: 'cp-order-timeline',
  imports: [DateTimePipe],
  template: `
    <ol>
      @for (event of events(); track event.id) {
        <li>
          <p class="title">{{ event.title }}</p>
          <p class="meta">{{ event.at | dateTime }} · {{ event.actor }}</p>
          @if (event.reason) {
            <p class="reason">Motivo: {{ event.reason }}</p>
          }
        </li>
      } @empty {
        <li class="meta">Todavía no hay movimientos.</li>
      }
    </ol>
  `,
  styles: `
    ol {
      margin: 0;
      padding: 0 0 0 var(--cp-space-md);
      list-style: none;
      border-left: 2px solid var(--cp-brand);
    }
    li {
      position: relative;
      padding: 0 0 var(--cp-space-md);
    }
    li::before {
      content: '';
      position: absolute;
      top: 6px;
      left: calc(-1 * var(--cp-space-md) - 6px);
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--cp-ink);
    }
    p {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .title {
      font: var(--mat-sys-title-small);
    }
    .meta {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .reason {
      margin-top: var(--cp-space-xs);
    }
  `,
})
export class OrderTimeline {
  readonly events = input.required<readonly TimelineEvent[]>();
}
