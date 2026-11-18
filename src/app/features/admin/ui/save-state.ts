import { signal } from '@angular/core';

import { adminErrorMessage } from '../models/admin-errors';

/**
 * @description Saving flag and error message for a form in the panel. The error is shown where the form is, so nothing is lost
 */
export class SaveState {
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /**
   * @param uniqueMessage Explains which value is repeated when the database rejects a duplicate
   * @returns true when the action finished without errors
   */
  async run(action: () => Promise<void>, uniqueMessage?: string): Promise<boolean> {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      await action();
      return true;
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(error, uniqueMessage));
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }
}
