import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SizeRecommendation } from '../models/size-calculator';

@Component({
  selector: 'cp-size-recommendation-view',
  imports: [RouterLink],
  template: `
    @if (result().size; as size) {
      <p class="headline">Te recomendamos la talla {{ size.label }}.</p>
      @if (result().matchesDiffer) {
        <p>
          Sus medidas caen en tallas distintas. Elegimos la más grande para que no le quede
          ajustada.
        </p>
      }
    } @else {
      <p class="headline">Sus medidas están fuera de nuestra tabla.</p>
      <p>
        Te hacemos una prenda a su medida.
        <a routerLink="/personalizado">Pide una prenda personalizada</a>.
      </p>
    }
  `,
  styles: `
    p {
      margin: 0 0 var(--cp-space-xs);
    }
    .headline {
      font: var(--mat-sys-title-medium);
    }
  `,
})
export class SizeRecommendationView {
  readonly result = input.required<SizeRecommendation>();
}
