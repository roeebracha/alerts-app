import fetch from 'node-fetch';

const OREF_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';
const POLL_INTERVAL = 5000; // 5 seconds

let lastAlertId = null;

export async function fetchOrefAlerts() {
  try {
    const response = await fetch(OREF_URL, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.oref.org.il/'
      }
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      return null;
    }

    return JSON.parse(text);
  } catch (error) {
    // Silent fail - no alerts or network issue
    return null;
  }
}

export function startOrefPolling(addAlert) {
  console.log('Started polling Pikud HaOref API');

  setInterval(async () => {
    const data = await fetchOrefAlerts();

    if (data && data.id && data.id !== lastAlertId) {
      lastAlertId = data.id;

      // Format alert content
      const areas = data.data ? data.data.join(', ') : 'לא ידוע';
      const content = `${data.title || 'התרעה'}: ${areas}`;

      addAlert(content, 'פיקוד העורף', data);
    }
  }, POLL_INTERVAL);
}
