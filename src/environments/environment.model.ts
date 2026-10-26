export interface Environment {
  production: boolean;
  siteUrl: string;
  supabase: {
    url: string;
    publishableKey: string;
  };
}
