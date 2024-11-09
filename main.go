package main

import (
	"log"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api"
)

var fileLinks = map[string]string{
    "file1": "music/DJ Sajjad & Fama - Ghalaf.mp3",
	"file2": "music/Barzakh.mp3",
	"file3": "music/Pishro - Tamum Shode (featuring Kamyar).mp3",
	"file4": "music/SAD!.mp3",
}

func main() {
	// توکن ربات تلگرام شما
	token := "6414679474:AAHBrTFt5sCbbudkXHu3JvPrR_Pj50T30qs"

	// اتصال به API تلگرام
	bot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		log.Panic(err)
	}

	// راه‌اندازی آپدیت‌ها
	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	updates, err := bot.GetUpdatesChan(u)
	if err != nil {
		log.Fatalf("Failed to get updates: %v", err) // یا پیغام دلخواه خودتان را ثبت کنید
	}
	
	// پردازش آپدیت‌ها
	for update := range updates {
		if update.Message == nil {
			continue
		}

		// شناسه چت کاربر
		chatID := update.Message.Chat.ID

		// متن پیام کاربر
		text := update.Message.Text

		// چاپ پیام ورودی برای اشکال‌زدایی
		log.Printf("Received message: %s", text)

		// بررسی اینکه آیا پیام شامل start=... است
		if strings.HasPrefix(text, "/start") {
			// استخراج پارامتر بعد از /start
			command := strings.TrimPrefix(text, "/start ")

			// چاپ فرمان استخراج‌شده
			log.Printf("Command extracted: %s", command)

			// بررسی و ارسال فایل
			if fileURL, exists := fileLinks[command]; exists {
				// ارسال فایل به کاربر
				file := tgbotapi.NewDocumentUpload(chatID, fileURL)
				_, err := bot.Send(file)
				if err != nil {
					log.Printf("Error sending file: %v", err)
				}
			} else {
				// ارسال پیام خطا در صورت عدم وجود فایل
				msg := tgbotapi.NewMessage(chatID, "لینک نامعتبر است.")
				bot.Send(msg)
			}
		} else {
			// اگر پارامتر start= وجود ندارد
			msg := tgbotapi.NewMessage(chatID, "لطفا لینک معتبر ارسال کنید.")
			bot.Send(msg)
		}
	}
}
