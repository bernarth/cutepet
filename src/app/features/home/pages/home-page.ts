import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { PageHeader } from '@shared/ui/page-header';

@Component({
  selector: 'cp-home-page',
  imports: [PageHeader, MatButtonModule, RouterLink],
  template: `
    <cp-page-header
      title="Ropa hecha a mano para tu mascota"
      subtitle="Modelos únicos, hechos en La Paz"
    />
    <a mat-flat-button class="cp-cta" routerLink="/catalogo">Ver catálogo</a>
  `,
})
export class HomePage {}
