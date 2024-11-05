const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// توکن ربات تلگرام خود را وارد کنید
const token = '8027380798:AAFR0gD_rRv11JIKbr5SuslUS8PBtzkjwl8';
const bot = new TelegramBot(token, { polling: true });

// پوشه‌ای برای ذخیره فایل‌های آپلود شده
const uploadDir = path.join(__dirname, 'uploads');

// اگر پوشه 'uploads' وجود ندارد، آن را ایجاد می‌کنیم
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// ذخیره وضعیت کاربران
const userStatus = {};

// پیام خوش‌آمدگویی و درخواست آیدی در /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userStatus[chatId] = { verified: false }; // وضعیت اولیه کاربر
    bot.sendMessage(chatId, `خوش آمدید! لطفاً ابتدا آیدی تلگرام خود را مانند @example_user ارسال کنید تا بتوانید فایل آپلود کنید.`);
});

// هندلر برای بررسی آیدی ارسالی کاربر
bot.onText(/^@([a-zA-Z0-9_]{5,})$/, (msg) => {
    const chatId = msg.chat.id;
    
    // اگر کاربر تأیید نشده، آیدی او را تأیید کنیم
    if (!userStatus[chatId]?.verified) {
        userStatus[chatId].verified = true; // تأیید آیدی
        bot.sendMessage(chatId, "آیدی شما تأیید شد! حالا می‌توانید فایل‌ها را آپلود کنید.");
    } else {
        bot.sendMessage(chatId, "شما قبلاً تأیید شده‌اید و می‌توانید فایل آپلود کنید.");
    }
});

// هندلر برای دریافت فایل‌ها (عکس، ویدیو، صوت و فایل‌های دیگر)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // چک کردن وضعیت کاربر و ارسال درخواست آیدی اگر تأیید نشده است
    if (!userStatus[chatId]?.verified) {
        return; // اگر کاربر تأیید نشده باشد، بدون ارسال پیام برمی‌گردد
    }

    // ادامه پردازش فایل‌ها فقط برای کاربران تأیید شده
    let fileId, fileName;
    if (msg.document) {
        fileId = msg.document.file_id;                     // اسناد
        fileName = msg.document.file_name || `file_${Date.now()}`; // نام فایل یا یک نام تصادفی
    } else if (msg.video) {
        fileId = msg.video.file_id;                        // ویدیو
        fileName = msg.video.file_name || `video_${Date.now()}`; // نام ویدیو یا یک نام تصادفی
    } else if (msg.audio) {
        fileId = msg.audio.file_id;                        // صوت
        fileName = msg.audio.file_name || `audio_${Date.now()}`; // نام صوت یا یک نام تصادفی
    } else if (msg.photo) {
        fileId = msg.photo[msg.photo.length - 1].file_id;  // عکس
        fileName = `photo_${Date.now()}.jpg`;              // چون عکس نام فایل ندارد
    } else {
        return bot.sendMessage(chatId, "لطفاً یک فایل معتبر (عکس، سند، ویدیو، صوت) ارسال کنید.");
    }

    try {
        // دانلود و ذخیره فایل با نام اصلی
        bot.downloadFile(fileId, uploadDir).then(filePath => {
            const originalFilePath = path.join(uploadDir, fileName);
            fs.rename(filePath, originalFilePath, (err) => {
                if (err) {
                    console.error('خطا در تغییر نام فایل:', err);
                    return bot.sendMessage(chatId, "مشکلی در ذخیره فایل شما به وجود آمد.");
                }
                bot.sendMessage(chatId, `فایل "${fileName}" با موفقیت آپلود شد \n برای ارسال فایل های بیشتر /start کلیک کنید!`);
            });
        });
    } catch (error) {
        console.error('خطا در دانلود فایل:', error);
        bot.sendMessage(chatId, "مشکلی در آپلود فایل شما به وجود آمد.");
    }
});

// هندلر برای لیست کردن فایل‌های آپلود شده
bot.onText(/\/list/, (msg) => {
    sendFileList(msg.chat.id);
});

// تابع برای ارسال لیست فایل‌های آپلود شده
function sendFileList(chatId) {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('خطا در خواندن فایل‌ها:', err);
            return bot.sendMessage(chatId, "مشکلی در خواندن فایل‌های آپلود شده به وجود آمد.");
        }

        if (files.length === 0) {
            bot.sendMessage(chatId, "هنوز هیچ فایلی آپلود نشده است.");
        } else {
            const fileButtons = files.map(file => [{ text: file, callback_data: `file_${file}` }]);
            bot.sendMessage(chatId, "فایل‌های آپلود شده:", {
                reply_markup: {
                    inline_keyboard: fileButtons
                }
            });
        }
    });
}

// هندلر برای دانلود فایل انتخاب‌شده از منوی لیست
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('file_')) {
        const fileName = data.replace('file_', '');
        const filePath = path.join(uploadDir, fileName);

        // چک کردن وجود فایل
        if (fs.existsSync(filePath)) {
            bot.sendDocument(chatId, filePath, {}, { filename: fileName })
                .catch(err => console.error('خطا در ارسال فایل:', err));
        } else {
            bot.sendMessage(chatId, "فایل مورد نظر یافت نشد.");
        }
    }
});
