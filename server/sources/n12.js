import fetch from 'node-fetch';

const YNET_RSS_URL = 'https://www.ynet.co.il/Integration/StoryRss2.xml';
const POLL_INTERVAL = 30000; // 30 seconds

// Keywords for Iran-Israel war
const KEYWORDS = [
  'איראן', 'טיל', 'טילים', 'מל"ט', 'כטב"ם',
  'אזעקה', 'צבע אדום', 'פיקוד העורף',
  'חיזבאללה', 'תימן', 'חות\'י',
  'יירוט', 'תקיפה', 'התקפה', 'פיצוץ',
  'חיל האוויר', 'צה"ל', 'חמינאי', 'משמרות המהפכה'
];

let seenIds = new Set();

function isRelevant(text) {
  if (!text) return false;
  return KEYWORDS.some(keyword => text.includes(keyword));
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                  itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/)?.[1] ||
                 itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const guid = itemXml.match(/<guid.*?>(.*?)<\/guid>/)?.[1] || link || title;

    items.push({ title, link, guid });
  }

  return items;
}

export async function fetchYnetNews() {
  try {
    const response = await fetch(YNET_RSS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRSS(xml);
  } catch (error) {
    console.error('Ynet fetch error:', error.message);
    return [];
  }
}

export function startN12Polling(addAlert) {
  console.log('Started polling Ynet RSS feed');

  const poll = async () => {
    const items = await fetchYnetNews();

    for (const item of items) {
      if (!seenIds.has(item.guid) && isRelevant(item.title)) {
        seenIds.add(item.guid);
        addAlert(item.title, 'Ynet חדשות', { link: item.link });
      }
    }

    // Keep only last 100 IDs
    if (seenIds.size > 100) {
      const arr = Array.from(seenIds);
      seenIds = new Set(arr.slice(-50));
    }
  };

  poll();
  setInterval(poll, POLL_INTERVAL);
}
