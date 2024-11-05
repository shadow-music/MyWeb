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

// پیام خوش‌آمدگویی با منوی شیشه‌ای به زبان فارسی
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userStatus[chatId] = { verified: false, requestedId: false }; // تعیین وضعیت اولیه برای کاربر

    bot.sendMessage(chatId, `خوش آمدید! لطفاً ابتدا آیدی تلگرام خود را مانند @example_user ارسال کنید تا بتوانید فایل آپلود کنید.`);
});

// بررسی آیدی ارسالی کاربر
bot.onText(/^@([a-zA-Z0-9_]{5,})$/, (msg) => {
    const chatId = msg.chat.id;
    
    // اگر شیء کاربر وجود ندارد، آن را ایجاد کنیم
    if (!userStatus[chatId]) {
        userStatus[chatId] = { verified: false, requestedId: false };
    }

    // بررسی اینکه آیا کاربر قبلاً تأیید شده است یا خیر
    if (userStatus[chatId].verified) {
        return bot.sendMessage(chatId, "شما قبلاً تأیید شده‌اید و می‌توانید فایل آپلود کنید.");
    }

    // تأیید آیدی و اجازه آپلود
    userStatus[chatId].verified = true;
    userStatus[chatId].requestedId = true;
    bot.sendMessage(chatId, "آیدی شما تأیید شد! حالا می‌توانید فایل‌ها را آپلود کنید.");
});

// هندلر برای دریافت فایل‌ها (عکس، ویدیو، صوت و فایل‌های دیگر)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // اطمینان از این‌که userStatus[chatId] وجود دارد
    if (!userStatus[chatId]) {
        userStatus[chatId] = { verified: false, requestedId: false };
    }

    // اگر پیام کاربر حاوی آیدی نیست و هنوز تأیید نشده است
    if (!userStatus[chatId].verified) {
        // چک کنیم که پیام درخواست آیدی قبلاً ارسال شده یا خیر
        if (!userStatus[chatId].requestedId) {
            userStatus[chatId].requestedId = true;
            return bot.sendMessage(chatId, "لطفاً ابتدا آیدی تلگرام خود را مانند @example_user ارسال کنید تا اجازه آپلود فایل به شما داده شود.");
        }
        return; // اگر پیام درخواست آیدی قبلاً ارسال شده باشد، هیچ پیام جدیدی ارسال نمی‌کند
    }

    // ادامه پردازش فایل‌ها فقط برای کاربران تأیید شده
    let fileId;
    if (msg.photo) {
        fileId = msg.photo[msg.photo.length - 1].file_id;  // عکس
    } else if (msg.document) {
        fileId = msg.document.file_id;                     // اسناد
    } else if (msg.video) {
        fileId = msg.video.file_id;                        // ویدیو
    } else if (msg.audio) {
        fileId = msg.audio.file_id;                        // صوت
    } else {
        return bot.sendMessage(chatId, "لطفاً یک فایل معتبر (عکس، سند، ویدیو، صوت) ارسال کنید.");
    }

    try {
        // دریافت لینک دانلود فایل
        const file = await bot.getFile(fileId);
        const filePath = file.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

        // دانلود و ذخیره فایل
        const fileName = path.basename(filePath);
        
        bot.downloadFile(fileId, uploadDir).then(() => {
            bot.sendMessage(chatId, `فایل "${fileName}" با موفقیت آپلود شد!`);
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
