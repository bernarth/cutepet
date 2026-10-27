import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { fitIssuesText } from '../models/measurements-text';
import { ProductFit, VariantFit, closestVariant } from '../models/size-calculator';

@Component({
  selector: 'cp-product-fit-list',
  imports: [MatIconModule, RouterLink],
  template: `
    @if (closest(); as fit) {
      <p class="headline">La más cercana: Talla {{ fit.variant.sizeLabel }}</p>
      <p>{{ issuesText(fit) }}.</p>
      <p>
        ¿Prefieres una a su medida?
        <a routerLink="/personalizado">Pide una prenda personalizada</a>.
      </p>
    } @else {
      <ul>
        @for (fit of result().variants; track fit.variant.id) {
          <li [class.fits]="fit.fits">
            <mat-icon aria-hidden="true">{{ fit.fits ? 'check_circle' : 'info' }}</mat-icon>
            <span>
              Talla {{ fit.variant.sizeLabel }}:
              {{ fit.fits ? 'le queda' : issuesText(fit) }}
            </span>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    ul {
      display: flex;
      flex-direction: column;
      gap: var(--cp-space-xs);
      margin: 0 0 var(--cp-space-xs);
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      gap: var(--cp-space-sm);
      align-items: flex-start;
    }
    .fits mat-icon {
      color: var(--mat-sys-primary);
    }
    p {
      margin: 0 0 var(--cp-space-xs);
    }
    .headline {
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class ProductFitList {
  readonly result = input.required<ProductFit>();

  protected readonly closest = computed(() => closestVariant(this.result()));

  protected issuesText(fit: VariantFit): string {
    return fitIssuesText(fit.issues);
  }
}
