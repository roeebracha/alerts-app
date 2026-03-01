import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getAlerts, addAlert, cleanOldAlerts } from './db.js';
import { startOrefPolling } from './sources/oref.js';
import { startNewsPolling } from './sources/news.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize database
initDb();

// Clean old alerts every hour
setInterval(cleanOldAlerts, 60 * 60 * 1000);

// API endpoint to get all alerts
app.get('/api/alerts', (req, res) => {
  const alerts = getAlerts();
  res.json(alerts);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Start polling Pikud HaOref
  startOrefPolling(addAlert);

  // Start polling all news sources
  startNewsPolling(addAlert);
});
