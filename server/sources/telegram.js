import { Telegraf } from 'telegraf';

// Keywords to filter relevant messages
const KEYWORDS = [
  'איראן', 'iran',
  'טיל', 'טילים', 'missile',
  'מל"ט', 'כטב"ם', 'drone',
  'צבא', 'חיל האוויר',
  'התקפה', 'תקיפה', 'attack',
  'אזעקה', 'צבע אדום',
  'חיזבאללה', 'hezbollah',
  'תימן', 'חות\'י', 'houthi',
  'פיצוץ', 'יירוט'
];

function isRelevant(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

export function startTelegramBot(addAlert) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log('Telegram: No bot token provided');
    return;
  }

  const bot = new Telegraf(token);

  // Listen to channel posts
  bot.on('channel_post', (ctx) => {
    const message = ctx.channelPost;
    const text = message.text || message.caption || '';
    const channelTitle = message.chat.title || 'ערוץ טלגרם';

    console.log(`[Telegram] Got message from: ${channelTitle}`);

    if (isRelevant(text)) {
      addAlert(text, `טלגרם: ${channelTitle}`, {
        channel: channelTitle,
        messageId: message.message_id
      });
    } else {
      console.log(`[Telegram] Message not relevant: ${text.substring(0, 50)}...`);
    }
  });

  // Listen to all messages (direct, groups, forwarded)
  bot.on('message', (ctx) => {
    const message = ctx.message;
    const text = message.text || message.caption || '';
    const chatTitle = message.chat.title || message.chat.username || 'הודעה ישירה';

    console.log(`[Telegram] Got message from: ${chatTitle} - "${text.substring(0, 50)}"`);

    // Forwarded messages
    if (message.forward_from_chat && isRelevant(text)) {
      const source = message.forward_from_chat.title || 'טלגרם';
      addAlert(text, `טלגרם: ${source}`, {
        forwardedFrom: source,
        messageId: message.message_id
      });
    }
    // Direct or group messages
    else if (isRelevant(text)) {
      addAlert(text, `טלגרם: ${chatTitle}`, {
        chat: chatTitle,
        messageId: message.message_id
      });
    }
  });

  bot.launch();
  console.log('Telegram bot started');

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
