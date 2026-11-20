import { Environment } from './environment.model';

export const environment: Environment = {
  defaultEnv: {
    SITE_URL: 'http://localhost:4200',
    SUPABASE_URL: 'http://127.0.0.1:54321',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
    // Cloudflare Turnstile test site key that always passes
    TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    NO_INDEX: 'true',
  },
};
