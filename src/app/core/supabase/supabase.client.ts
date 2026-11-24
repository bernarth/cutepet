import { isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { RUNTIME_CONFIG } from '@core/config/runtime-config';
import { Database } from './database.types';

export type CutePetSupabase = SupabaseClient<Database>;

/**
 * Single Supabase client for the whole app.
 * On the server (SSR) there is no session: it only reads public data (catalog, products),
 * which is enough for link previews and SEO. Sessions live only in the browser.
 * The client never reads the address: only the sign-in callback page exchanges a code.
 */
export const SUPABASE = new InjectionToken<CutePetSupabase>('SUPABASE', {
  providedIn: 'root',
  factory: () => {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const config = inject(RUNTIME_CONFIG);

    return createClient<Database>(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
    });
  },
});
