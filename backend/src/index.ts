import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';

createApp()
  .then((app) => {
    app.listen(env.port, () => {
      console.log(`[dgnotas-api] listening on http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    console.error('[dgnotas-api] failed to start:', err);
    process.exit(1);
  });
