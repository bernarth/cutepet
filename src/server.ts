import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

import { runtimeConfigScript } from '@core/config/runtime-config';
import { serverRuntimeConfig } from '@core/config/server-runtime-config';
import { robotsTxt } from '@core/seo/robots-txt';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use((_req, res, next) => {
  if (serverRuntimeConfig().noIndex) {
    res.set('X-Robots-Tag', 'noindex');
  }
  next();
});

app.get('/runtime-config.js', (_req, res) => {
  res
    .type('text/javascript')
    .set('Cache-Control', 'no-cache')
    .send(runtimeConfigScript(serverRuntimeConfig()));
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(robotsTxt(serverRuntimeConfig().noIndex));
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  serverRuntimeConfig();
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
