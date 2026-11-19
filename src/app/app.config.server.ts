import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { RUNTIME_CONFIG } from '@core/config/runtime-config';
import { serverRuntimeConfig } from '@core/config/server-runtime-config';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: RUNTIME_CONFIG, useFactory: serverRuntimeConfig },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
