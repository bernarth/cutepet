import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  siteUrl: 'http://localhost:4200',
  supabase: {
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  },
};
