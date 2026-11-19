import { environment } from '@env/environment';
import { RuntimeConfig, readRuntimeConfig } from './runtime-config';

let cachedConfig: RuntimeConfig | undefined;

/** Only for server code. Read on first use because the build also loads the server. The development build fills in the local stack values */
export function serverRuntimeConfig(): RuntimeConfig {
  cachedConfig ??= readRuntimeConfig({ ...environment.defaultEnv, ...process.env });

  return cachedConfig;
}
