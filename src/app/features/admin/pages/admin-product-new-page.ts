import { Component, computed, inject, signal } from '@angular/core';
import { form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';

import { AdminProductStore } from '../data-access/admin-product.store';
import { EMPTY_PRODUCT_FORM, ProductFormModel, productFormSchema } from '../models/product-form';
import { slugify } from '../models/slugify';
import { ProductFormFields } from '../ui/product-form-fields';
import { SaveState } from '../ui/save-state';

@Component({
  selector: 'cp-admin-product-new-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, ProductFormFields],
  template: `
    <a mat-button routerLink="/admin/prendas"><mat-icon>arrow_back</mat-icon>Prendas</a>
    <h1>Nueva prenda</h1>
    <p class="intro">Primero sus datos. Después agregas las tallas y las fotos.</p>

    <form novalidate (submit)="create($event)">
      <cp-product-form-fields
        [form]="form"
        [petTypes]="store.lookups().petTypes"
        [categories]="store.lookups().categories"
      />
      <p class="slug">Enlace: /catalogo/{{ slug() || '…' }}</p>
      @if (saving.errorMessage(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      <div class="actions">
        <a mat-button routerLink="/admin/prendas">Cancelar</a>
        <button mat-flat-button type="submit" [disabled]="saving.isSaving()">Crear prenda</button>
      </div>
    </form>
  `,
  styles: `
    :host {
      display: block;
      max-width: 720px;
    }
    h1 {
      margin: var(--cp-space-sm) 0 var(--cp-space-xs);
      font-family: var(--cp-font-display);
    }
    .intro,
    .slug {
      margin: 0 0 var(--cp-space-md);
      color: var(--mat-sys-on-surface-variant);
    }
    .slug {
      overflow-wrap: anywhere;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--cp-space-sm);
    }
  `,
})
export class AdminProductNewPage {
  protected readonly store = inject(AdminProductStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly saving = new SaveState();
  private readonly model = signal<ProductFormModel>({ ...EMPTY_PRODUCT_FORM });
  protected readonly form = form(this.model, productFormSchema);
  protected readonly slug = computed(() => slugify(this.model().name));

  protected create(event: Event): void {
    event.preventDefault();
    void submit(this.form, async () => {
      let id = 0;
      const saved = await this.saving.run(async () => {
        id = await this.store.createProduct(this.model());
      }, 'Ya existe una prenda con ese nombre. Usa otro nombre.');

      if (saved) {
        this.snackBar.open('Prenda creada. Ahora agrega sus tallas.', undefined, {
          duration: 4000,
        });
        await this.router.navigate(['/admin/prendas', id]);
      }
    });
  }
}
