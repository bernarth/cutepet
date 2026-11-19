import { InjectionToken } from '@angular/core';

/** Values read from environment variables when the server starts, so one image works for QA and production */
export interface RuntimeConfig {
  readonly siteUrl: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly noIndex: boolean;
}

export type EnvVariables = Readonly<Record<string, string | undefined>>;

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');

const PUBLISHABLE_KEY_PREFIX = 'sb_publishable_';
const BROWSER_GLOBAL_NAME = 'cutepetRuntimeConfig';

export function readRuntimeConfig(env: EnvVariables): RuntimeConfig {
  const supabasePublishableKey = requiredVariable(env, 'SUPABASE_PUBLISHABLE_KEY');
  if (!supabasePublishableKey.startsWith(PUBLISHABLE_KEY_PREFIX)) {
    throw new Error(
      `SUPABASE_PUBLISHABLE_KEY must start with ${PUBLISHABLE_KEY_PREFIX} because every browser receives it`,
    );
  }

  return {
    siteUrl: requiredVariable(env, 'SITE_URL').replace(/\/+$/, ''),
    supabaseUrl: requiredVariable(env, 'SUPABASE_URL'),
    supabasePublishableKey,
    noIndex: env['NO_INDEX']?.trim() !== 'false',
  };
}

/** Body of /runtime-config.js, loaded by index.html before the app starts */
export function runtimeConfigScript(config: RuntimeConfig): string {
  return `window.${BROWSER_GLOBAL_NAME} = ${JSON.stringify(config)};\n`;
}

export function browserRuntimeConfig(): RuntimeConfig {
  const config = (window as { [BROWSER_GLOBAL_NAME]?: RuntimeConfig })[BROWSER_GLOBAL_NAME];
  if (!config) {
    throw new Error('/runtime-config.js did not load');
  }

  return config;
}

function requiredVariable(env: EnvVariables, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }

  return value;
}
