import { Component, computed, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { LookupOption } from '../models/admin-product';
import { DESCRIPTION_MAX_LENGTH, ProductFormModel } from '../models/product-form';

/**
 * @description Product data fields shared by the create and edit pages. Inactive options stay only when already selected
 */
@Component({
  selector: 'cp-product-form-fields',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './product-form-fields.html',
  styles: `
    :host {
      display: grid;
      gap: var(--cp-space-xs) var(--cp-space-md);
    }
    @media (min-width: 600px) {
      :host {
        grid-template-columns: 1fr 1fr;
      }
      .wide {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class ProductFormFields {
  readonly form = input.required<FieldTree<ProductFormModel>>();
  readonly petTypes = input.required<readonly LookupOption[]>();
  readonly categories = input.required<readonly LookupOption[]>();

  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  protected readonly petTypeOptions = computed(() =>
    selectable(this.petTypes(), this.form().petTypeId().value()),
  );
  protected readonly categoryOptions = computed(() =>
    selectable(this.categories(), this.form().categoryId().value()),
  );
}

function selectable(options: readonly LookupOption[], selectedId: number | null): LookupOption[] {
  return options.filter((option) => option.active || option.id === selectedId);
}
