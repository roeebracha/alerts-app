import fetch from 'node-fetch';
import iconv from 'iconv-lite';

// All RSS news sources
const SOURCES = [
  {
    name: 'Ynet חדשות',
    url: 'https://www.ynet.co.il/Integration/StoryRss2.xml',
    encoding: 'utf-8'
  },
  {
    name: 'Walla חדשות',
    url: 'https://rss.walla.co.il/feed/1?type=main',
    encoding: 'utf-8'
  },
  {
    name: 'רוטר',
    url: 'https://rotter.net/rss/rotternews.xml',
    encoding: 'windows-1255'
  },
  {
    name: 'הארץ',
    url: 'https://www.haaretz.co.il/cmlink/1.1617539',
    encoding: 'utf-8'
  }
];

const POLL_INTERVAL = 30000; // 30 seconds

// Keywords for Iran-Israel war (Hebrew and English)
const KEYWORDS = [
  'איראן', 'iran', 'iranian',
  'טיל', 'טילים', 'missile', 'ballistic',
  'מל"ט', 'כטב"ם', 'drone', 'uav',
  'אזעקה', 'צבע אדום', 'פיקוד העורף', 'red alert',
  'חיזבאללה', 'hezbollah', 'lebanon',
  'תימן', 'חות\'י', 'houthi', 'yemen',
  'יירוט', 'תקיפה', 'התקפה', 'attack', 'strike',
  'חיל האוויר', 'צה"ל', 'idf', 'air force',
  'חמינאי', 'khamenei', 'tehran', 'טהרן',
  'משמרות המהפכה', 'irgc', 'revolutionary guard',
  'nuclear', 'גרעין', 'natanz', 'פורדו'
];

let seenIds = new Set();

function isRelevant(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    // Try multiple formats for title
    let title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';

    // Clean HTML entities
    title = title.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
                 .replace(/&#\d+;/g, '').replace(/&apos;/g, "'").replace(/&quot;/g, '"');

    // Try multiple formats for link
    const link = itemXml.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/)?.[1] ||
                 itemXml.match(/<link>(.*?)<\/link>/)?.[1] ||
                 itemXml.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';

    const guid = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || link || title;

    if (title && title.length > 5) {
      items.push({ title: title.trim(), link, guid });
    }
  }

  return items;
}

async function fetchRSS(source) {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    if (!response.ok) {
      console.log(`[${source.name}] HTTP ${response.status}`);
      return [];
    }

    // Handle different encodings
    let xml;
    if (source.encoding === 'windows-1255') {
      const buffer = await response.arrayBuffer();
      xml = iconv.decode(Buffer.from(buffer), 'windows-1255');
    } else {
      xml = await response.text();
    }

    return parseRSS(xml);
  } catch (error) {
    console.error(`[${source.name}] Error:`, error.message);
    return [];
  }
}

export function startNewsPolling(addAlert) {
  console.log(`Started polling ${SOURCES.length} news sources`);

  const poll = async () => {
    for (const source of SOURCES) {
      const items = await fetchRSS(source);

      for (const item of items) {
        if (!seenIds.has(item.guid) && isRelevant(item.title)) {
          seenIds.add(item.guid);
          addAlert(item.title, source.name, { link: item.link });
        }
      }
    }

    // Keep only last 500 IDs
    if (seenIds.size > 500) {
      const arr = Array.from(seenIds);
      seenIds = new Set(arr.slice(-250));
    }
  };

  poll();
  setInterval(poll, POLL_INTERVAL);
}
