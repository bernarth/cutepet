import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { fitIssueText } from '../models/measurements-text';
import { VARIANT_AVAILABILITY_SUFFIX } from '../models/product';
import { ProductFit, VariantFit } from '../models/size-calculator';

@Component({
  selector: 'cp-product-fit-list',
  imports: [MatIconModule, RouterLink],
  template: `
    <ul>
      @for (fit of result().variants; track fit.variant.id) {
        <li [class.fits]="fit.fits">
          <mat-icon aria-hidden="true">{{ fit.fits ? 'check_circle' : 'info' }}</mat-icon>
          <span>
            Talla {{ fit.variant.sizeLabel }}{{ availabilitySuffix[fit.variant.availability] }}:
            {{ fit.fits ? 'le queda' : issuesText(fit) }}
          </span>
        </li>
      }
    </ul>
    @if (noneFits()) {
      <p>
        Ninguna talla le queda. <a routerLink="/personalizado">Pide una prenda personalizada</a>.
      </p>
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
  `,
})
export class ProductFitList {
  readonly result = input.required<ProductFit>();

  protected readonly noneFits = computed(() => this.result().variants.every((fit) => !fit.fits));
  protected readonly availabilitySuffix = VARIANT_AVAILABILITY_SUFFIX;

  protected issuesText(fit: VariantFit): string {
    return fit.issues.map(fitIssueText).join(' y ');
  }
}
