import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';

// Get these from https://my.telegram.org/apps
const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const SESSION = process.env.TELEGRAM_SESSION || '';

// Channels to monitor (usernames without @)
const CHANNELS = [
  'aaborabei',      // אבו עלי אקספרס
  'kann_news',      // כאן חדשות
  'newsikiMishak',  // ניקי ומשק
  // Add more channels here
];

// Keywords for filtering
const KEYWORDS = [
  'איראן', 'טיל', 'טילים', 'מל"ט', 'כטב"ם',
  'אזעקה', 'צבע אדום', 'פיקוד העורף',
  'חיזבאללה', 'תימן', 'חות\'י',
  'יירוט', 'תקיפה', 'התקפה', 'פיצוץ',
  'חיל האוויר', 'צה"ל', 'חמינאי', 'משמרות המהפכה'
];

function isRelevant(text) {
  if (!text) return false;
  return KEYWORDS.some(keyword => text.includes(keyword));
}

export async function startUserbot(addAlert) {
  if (!API_ID || !API_HASH) {
    console.log('Userbot: API_ID or API_HASH not set - disabled');
    console.log('Get them from: https://my.telegram.org/apps');
    return;
  }

  const stringSession = new StringSession(SESSION);
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('Enter your phone number: '),
    password: async () => await input.text('Enter your 2FA password (if any): '),
    phoneCode: async () => await input.text('Enter the code you received: '),
    onError: (err) => console.log(err),
  });

  // Save session for next time
  console.log('Save this session string in TELEGRAM_SESSION env var:');
  console.log(client.session.save());

  console.log('Userbot connected! Monitoring channels...');

  // Listen to new messages
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.text) return;

    const chat = await message.getChat();
    const channelName = chat.title || chat.username || 'Unknown';

    // Check if from monitored channel
    const username = chat.username?.toLowerCase();
    if (!CHANNELS.includes(username)) return;

    if (isRelevant(message.text)) {
      console.log(`[Userbot] Got message from ${channelName}`);
      addAlert(message.text, `טלגרם: ${channelName}`, {
        channel: channelName,
        messageId: message.id
      });
    }
  });
}
