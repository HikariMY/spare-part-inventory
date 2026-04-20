import 'dotenv/config';
import app from './app.js';
import { startScheduler } from './lib/scheduler.js';

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.info(`API server running on http://localhost:${PORT}`);
  startScheduler();
});
