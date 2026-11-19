import { mergeApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RUNTIME_CONFIG, browserRuntimeConfig } from '@core/config/runtime-config';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const browserConfig = mergeApplicationConfig(appConfig, {
  providers: [{ provide: RUNTIME_CONFIG, useFactory: browserRuntimeConfig }],
});

bootstrapApplication(App, browserConfig).catch((err) => console.error(err));
