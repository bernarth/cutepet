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
import { Session, SignInWithOAuthCredentials } from '@supabase/supabase-js';

import { SUPABASE } from '@core/supabase/supabase.client';
import { unwrap } from '@shared/data-access/supabase-result';
import { accessTokenRole } from './access-token';
import { RETURN_PATH_PARAM, SIGN_IN_CALLBACK_PATH } from './return-path';
import { SignInAttempt, SignInAttemptStorage } from './sign-in-attempt';

export type AppRole = 'admin' | 'customer';

interface OAuthStart {
  readonly url: string | null;
}

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
  private readonly attempt = inject(SignInAttemptStorage);

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
   * @param captchaToken Turnstile token, required by Supabase only when a guest has to be created
   * @returns Session
   */
  async ensureSession(captchaToken?: string): Promise<Session> {
    const current = this.session();

    if (current) {
      return current;
    }

    const { session } = unwrap(
      await this.supabase.auth.signInAnonymously({ options: { captchaToken } }),
    );

    if (!session) {
      throw new Error('No se pudo iniciar la sesión de invitado');
    }

    return session;
  }

  /**
   * @description Starts Google sign-in, always showing Google's account picker. Google sends the user back to the callback page
   * @param returnPath Page to open after sign-in, for example `/admin`
   */
  async signInWithGoogle(returnPath: string): Promise<void> {
    this.attempt.save({ kind: 'signing_in' });
    unwrap<OAuthStart>(await this.supabase.auth.signInWithOAuth(this.google(returnPath, true)));
  }

  /**
   * @description Turns the current guest into a Google account, which keeps the guest's orders
   */
  async linkGoogle(returnPath: string): Promise<void> {
    this.attempt.save({ kind: 'linking' });
    unwrap<OAuthStart>(await this.supabase.auth.linkIdentity(this.google(returnPath, true)));
  }

  /**
   * @description Second trip to Google when the account already exists. Without the picker Google usually passes
   * straight through
   * @param transfer What the guest takes to that account
   */
  async signInToTransfer(
    returnPath: string,
    transfer: Extract<SignInAttempt, { kind: 'transferring' }>,
    showPicker: boolean,
  ): Promise<void> {
    this.attempt.save(transfer);
    unwrap<OAuthStart>(
      await this.supabase.auth.signInWithOAuth(this.google(returnPath, showPicker)),
    );
  }

  /**
   * @description Exchanges the code Google sign-in came back with. It only works in the browser that started the sign-in
   */
  async completeSignIn(code: string): Promise<void> {
    const { session } = unwrap<{ session: Session | null }>(
      await this.supabase.auth.exchangeCodeForSession(code),
    );
    this.session.set(session);
  }

  /** Other devices stay signed in */
  async signOut(): Promise<void> {
    this.attempt.clear();
    await this.supabase.auth.signOut({ scope: 'local' });
  }

  private google(returnPath: string, showPicker: boolean): SignInWithOAuthCredentials {
    const callback = new URL(SIGN_IN_CALLBACK_PATH, this.document.location.origin);
    callback.searchParams.set(RETURN_PATH_PARAM, returnPath);

    return {
      provider: 'google',
      options: {
        redirectTo: callback.toString(),
        ...(showPicker && { queryParams: { prompt: 'select_account' } }),
      },
    };
  }
}
