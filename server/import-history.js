import Database from 'better-sqlite3';

const db = new Database('alerts.db');

async function importHistory() {
  console.log('Fetching historical alerts...');

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

  // Group alerts by time to combine locations
  const grouped = {};

  for (const alert of data) {
    const key = alert.alertDate;
    if (!grouped[key]) {
      grouped[key] = {
        timestamp: alert.alertDate,
        locations: [],
        category: alert.category_desc
      };
    }
    grouped[key].locations.push(alert.data);
  }

  console.log(`Grouped into ${Object.keys(grouped).length} unique alerts`);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO alerts (content, source, timestamp, raw_data)
    VALUES (?, ?, ?, ?)
  `);

  let added = 0;

  for (const [time, alert] of Object.entries(grouped)) {
    const content = `צבע אדום: ${alert.locations.slice(0, 10).join(', ')}${alert.locations.length > 10 ? '...' : ''}`;
    const timestamp = alert.timestamp.replace('T', ' ');

    try {
      stmt.run(content, 'פיקוד העורף', timestamp, JSON.stringify(alert));
      added++;
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`Added ${added} alerts to database`);
}

importHistory().catch(console.error);
