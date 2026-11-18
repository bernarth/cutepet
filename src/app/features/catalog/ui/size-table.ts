import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

import { Size } from '@core/catalog/size';

@Component({
  selector: 'cp-size-table',
  imports: [MatTableModule, DecimalPipe],
  template: `
    <div class="scroll">
      <table mat-table [dataSource]="sizes()">
        <caption>
          Medidas de la mascota en centímetros
        </caption>
        <ng-container matColumnDef="label">
          <th mat-header-cell *matHeaderCellDef scope="col">Talla</th>
          <th mat-cell *matCellDef="let size" scope="row">{{ size.label }}</th>
        </ng-container>
        <ng-container matColumnDef="neck">
          <th mat-header-cell *matHeaderCellDef scope="col">Cuello</th>
          <td mat-cell *matCellDef="let size">
            {{ size.neck.min | number }} – {{ size.neck.max | number }}
          </td>
        </ng-container>
        <ng-container matColumnDef="chest">
          <th mat-header-cell *matHeaderCellDef scope="col">Pecho</th>
          <td mat-cell *matCellDef="let size">
            {{ size.chest.min | number }} – {{ size.chest.max | number }}
          </td>
        </ng-container>
        <ng-container matColumnDef="backLength">
          <th mat-header-cell *matHeaderCellDef scope="col">Largo</th>
          <td mat-cell *matCellDef="let size">
            {{ size.backLength.min | number }} – {{ size.backLength.max | number }}
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>
  `,
  styles: `
    .scroll {
      overflow-x: auto;
      border: var(--cp-border-soft);
      border-radius: var(--cp-radius);
    }
    caption {
      padding: var(--cp-space-sm);
      text-align: start;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    th[mat-cell] {
      font-weight: 700;
    }
  `,
})
export class SizeTable {
  readonly sizes = input.required<Size[]>();

  protected readonly columns = ['label', 'neck', 'chest', 'backLength'];
}
