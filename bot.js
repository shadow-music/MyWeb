const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// توکن ربات شما
const token = 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

// شناسه چت برای ارسال فایل
const chatId = 'YOUR_CHAT_ID'; // شناسه گروه یا شخصی که فایل به آن ارسال می‌شود

// آرایه برای ذخیره شناسه کاربران
let userIds = new Set();

// بررسی پیام‌ها و ذخیره شناسه کاربران
bot.on('message', (msg) => {
  const userId = msg.from.id;
  userIds.add(userId);
});

// تابعی برای ایجاد و ارسال فایل لینک‌های پروفایل کاربران
function sendUserLinks() {
  // ایجاد لینک‌ها
  const links = Array.from(userIds).map(id => `https://t.me/user?id=${id}`).join('\n');

  // ذخیره لینک‌ها در فایل متنی
  const filePath = './user_links.txt';
  fs.writeFileSync(filePath, links);

  // ارسال فایل به کاربر
  bot.sendDocument(chatId, filePath, { caption: 'لینک‌های اعضای گروه' })
    .then(() => {
      // پاک کردن فایل و بازنشانی آرایه کاربران
      fs.unlinkSync(filePath);
      userIds.clear();
    })
    .catch(error => console.error("خطا در ارسال فایل:", error));
}

// اجرای تابع هر 5 دقیقه یکبار
setInterval(sendUserLinks, 5 * 60 * 1000); // 5 دقیقه = 5 * 60 * 1000 میلی‌ثانیه
