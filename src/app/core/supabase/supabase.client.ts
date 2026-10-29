import { isPlatformBrowser } from '@angular/common';
import { InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { environment } from '@env/environment';
import { Database } from './database.types';

export type CutePetSupabase = SupabaseClient<Database>;

/**
 * Single Supabase client for the whole app.
 * On the server (SSR) there is no session: it only reads public data (catalog, products),
 * which is enough for link previews and SEO. Sessions live only in the browser.
 */
export const SUPABASE = new InjectionToken<CutePetSupabase>('SUPABASE', {
  providedIn: 'root',
  factory: () => {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    return createClient<Database>(environment.supabase.url, environment.supabase.publishableKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  },
});
