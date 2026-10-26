import { environment as production } from './environment';

export const environment: typeof production = {
  ...production,
  production: false,
  siteUrl: 'http://localhost:4200',
};
