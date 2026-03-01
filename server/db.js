import Database from 'better-sqlite3';

const db = new Database('alerts.db');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      raw_data TEXT
    )
  `);
  console.log('Database initialized');
}

export function addAlert(content, source, rawData = null) {
  const stmt = db.prepare(
    'INSERT INTO alerts (content, source, raw_data) VALUES (?, ?, ?)'
  );
  const result = stmt.run(content, source, rawData ? JSON.stringify(rawData) : null);
  console.log(`Alert added: [${source}] ${content.substring(0, 50)}...`);
  return result.lastInsertRowid;
}

export function getAlerts(limit = 1000) {
  const stmt = db.prepare(
    'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?'
  );
  return stmt.all(limit);
}

export function cleanOldAlerts() {
  // Keep alerts for 7 days instead of 24 hours
  const stmt = db.prepare(
    "DELETE FROM alerts WHERE timestamp < datetime('now', '-7 days')"
  );
  const result = stmt.run();
  if (result.changes > 0) {
    console.log(`Cleaned ${result.changes} old alerts`);
  }
}
