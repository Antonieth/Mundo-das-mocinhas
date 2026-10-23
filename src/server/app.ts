import express from 'express';
import path from 'node:path';
import { authMiddleware } from './auth.js';
import { apiRouter } from './routes.js';

export function createExpressApp() {
  const app = express();

  // Support base64 receipt uploads up to 15MB
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(authMiddleware);

  // Serve static assets from public/assets if requested via Express
  const publicAssetsPath = path.resolve(process.cwd(), 'public', 'assets');
  app.use('/assets', express.static(publicAssetsPath));

  // Mount core API Router
  app.use('/api', apiRouter);

  return app;
}

export const app = createExpressApp();
