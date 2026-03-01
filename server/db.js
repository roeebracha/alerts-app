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

  // Import historical alerts on first run
  const count = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE source = ?').get('פיקוד העורף');
  if (count.c === 0) {
    console.log('Importing historical alerts...');
    importHistoricalAlerts();
  }
}

async function importHistoricalAlerts() {
  try {
    const response = await fetch(
      'https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&fromDate=2025-02-28&toDate=2026-03-01',
      {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://www.oref.org.il/'
        }
      }
    );

    const data = await response.json();
    console.log(`Found ${data.length} historical alerts`);

    // Group alerts by time
    const grouped = {};
    for (const alert of data) {
      const key = alert.alertDate;
      if (!grouped[key]) {
        grouped[key] = { timestamp: alert.alertDate, locations: [] };
      }
      grouped[key].locations.push(alert.data);
    }

    const stmt = db.prepare(
      'INSERT OR IGNORE INTO alerts (content, source, timestamp, raw_data) VALUES (?, ?, ?, ?)'
    );

    let added = 0;
    for (const [time, alert] of Object.entries(grouped)) {
      const content = `צבע אדום: ${alert.locations.slice(0, 10).join(', ')}${alert.locations.length > 10 ? '...' : ''}`;
      const timestamp = alert.timestamp.replace('T', ' ');
      try {
        stmt.run(content, 'פיקוד העורף', timestamp, JSON.stringify(alert));
        added++;
      } catch (e) {}
    }
    console.log(`Added ${added} historical alerts`);
  } catch (error) {
    console.error('Failed to import historical alerts:', error.message);
  }
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
