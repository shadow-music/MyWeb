const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// توکن ربات تلگرام خود را وارد کنید
const token = '6352712951:AAHtDi_d8NfcmpaYYE9uqX9jZGD-6lsyj40';
const bot = new TelegramBot(token, { polling: true });

// پوشه‌ای برای ذخیره فایل‌های آپلود شده
const uploadDir = path.join(__dirname, 'uploads');

// اگر پوشه 'uploads' وجود ندارد، آن را ایجاد می‌کنیم
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// پیام استارت با منوی شیشه‌ای
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Welcome! Send me any file to upload, or use /list to see uploaded files.', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📄 Show Uploaded Files', callback_data: 'list_files' }]
            ]
        }
    });
});

// هندلر برای فایل‌ها (عکس، ویدیو، صوت و فایل‌های دیگر)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    
    // چک کردن نوع فایل
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
        return bot.sendMessage(chatId, "Please send a valid file (photo, document, video, audio).");
    }

    try {
        // دریافت لینک دانلود فایل
        const file = await bot.getFile(fileId);
        const filePath = file.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

        // دانلود فایل و ذخیره آن
        const fileName = path.basename(filePath);
        const fileStream = fs.createWriteStream(path.join(uploadDir, fileName));
        
        bot.downloadFile(fileId, uploadDir).then(() => {
            bot.sendMessage(chatId, `File "${fileName}" has been uploaded successfully!`);
        });
    } catch (error) {
        console.error('Error downloading file:', error);
        bot.sendMessage(chatId, "There was an error uploading your file.");
    }
});

// هندلر برای لیست کردن فایل‌های آپلود شده
bot.onText(/\/list/, (msg) => {
    sendFileList(msg.chat.id);
});

// هندلر برای منوی شیشه‌ای (لیست فایل‌ها)
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'list_files') {
        sendFileList(chatId);
    }
});

// تابع برای ارسال لیست فایل‌های آپلود شده
function sendFileList(chatId) {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('Error reading files:', err);
            return bot.sendMessage(chatId, "There was an error reading the uploaded files.");
        }

        if (files.length === 0) {
            bot.sendMessage(chatId, "No files have been uploaded yet.");
        } else {
            const fileButtons = files.map(file => [{ text: file, callback_data: `file_${file}` }]);
            bot.sendMessage(chatId, "Uploaded files:", {
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
                .catch(err => console.error('Error sending file:', err));
        } else {
            bot.sendMessage(chatId, "File not found.");
        }
    }
});
