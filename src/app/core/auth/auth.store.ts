import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  DestroyRef,
  PLATFORM_ID,
  Service,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Session } from '@supabase/supabase-js';

import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import { accessTokenRole } from './access-token';

export type AppRole = 'admin' | 'customer';

/**
 * @description Session state for the whole app.
 * - Guests use Supabase anonymous sign-in, created only when needed (checkout), not on every page visit
 * - The admin role is read from the access token claims (`app_metadata.role`), set server-side by a custom access token hook.
 *   `session.user.app_metadata` is the stored user record and never carries it. Never trust a role coming from the client
 */
@Service()
export class AuthStore {
  private readonly supabase = inject(SUPABASE);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);

  private readonly session = signal<Session | null>(null);

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isGuest = computed(() => this.user()?.is_anonymous ?? true);
  readonly isSignedIn = computed(() => !this.isGuest());
  readonly role = computed<AppRole>(() =>
    accessTokenRole(this.session()?.access_token) === 'admin' ? 'admin' : 'customer',
  );
  readonly isAdmin = computed(() => this.role() === 'admin');

  /** Resolves once the stored session (if any) has been restored. */
  readonly ready: Promise<void>;

  constructor() {
    if (!this.isBrowser) {
      this.ready = Promise.resolve();
      return;
    }

    const { data } = this.supabase.auth.onAuthStateChange((_event, session) =>
      this.session.set(session),
    );
    inject(DestroyRef).onDestroy(() => data.subscription.unsubscribe());
    this.ready = this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.session.set(session);
    });
  }

  /**
   * @description Guarantees a session (anonymous if needed) before creating an order.
   * @returns Session
   */
  async ensureSession(): Promise<Session> {
    const current = this.session();

    if (current) {
      return current;
    }

    const { session } = unwrap(await this.supabase.auth.signInAnonymously());

    if (!session) {
      throw new Error('No se pudo iniciar la sesión de invitado');
    }

    return session;
  }

  /**
   * @description Starts Google sign-in, always showing Google's account picker. Google sends the user back to `returnPath` on the current site
   * @param returnPath Path to open after sign-in, for example `/admin`
   */
  async signInWithGoogle(returnPath: string): Promise<void> {
    const redirectTo = new URL(returnPath, this.document.location.origin).toString();
    unwrap<{ url: string | null }>(
      await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      }),
    );
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
