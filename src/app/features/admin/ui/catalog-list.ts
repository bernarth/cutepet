import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CatalogListRow {
  readonly id: number;
  readonly title: string;
  readonly detail: string;
  readonly active: boolean;
}

/**
 * @description One list for categories, pet types and sizes: edit, deactivate or activate again. Nothing is deleted
 */
@Component({
  selector: 'cp-catalog-list',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <ul>
      @for (row of rows(); track row.id) {
        <li [class.inactive]="!row.active">
          <div class="text">
            <p class="title">
              {{ row.title }}
              @if (!row.active) {
                <span class="badge">Inactiva</span>
              }
            </p>
            <p class="detail">{{ row.detail }}</p>
          </div>
          <div class="actions">
            <button
              mat-button
              type="button"
              [attr.aria-label]="'Editar ' + row.title"
              (click)="edit.emit(row.id)"
            >
              <mat-icon>edit</mat-icon>
              Editar
            </button>
            <button mat-button type="button" (click)="toggleActive.emit(row.id)">
              {{ row.active ? 'Desactivar' : 'Activar' }}
            </button>
          </div>
        </li>
      } @empty {
        <li class="detail">Todavía no hay nada aquí.</li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      gap: var(--cp-space-xs);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--cp-space-xs) var(--cp-space-sm);
      padding: var(--cp-space-sm) var(--cp-space-sm) var(--cp-space-sm) var(--cp-space-md);
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
      background: var(--mat-sys-surface-container-lowest);
    }
    .inactive .title {
      color: var(--mat-sys-on-surface-variant);
    }
    .text {
      flex: 1 1 200px;
      min-width: 0;
    }
    p {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .title {
      font: var(--mat-sys-title-small);
    }
    .detail {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .badge {
      margin-left: var(--cp-space-xs);
      padding: 0 var(--cp-space-sm);
      border-radius: var(--cp-radius);
      font: var(--mat-sys-label-small);
      color: var(--cp-ink);
      background: var(--mat-sys-surface-container-highest);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
    }
  `,
})
export class CatalogList {
  readonly rows = input.required<readonly CatalogListRow[]>();
  readonly edit = output<number>();
  readonly toggleActive = output<number>();
}
