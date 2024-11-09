package main

import (
	"encoding/json"
	"log"
	"net/http"
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

	// راه‌اندازی Webhook
	webhookURL := "https://YOUR_URL.com/" + bot.Token // این URL باید آدرس سرور شما باشد
	_, err = bot.SetWebhook(tgbotapi.NewWebhook(webhookURL))
	if err != nil {
		log.Fatalf("Failed to set webhook: %v", err)
	}

	// شروع سرور HTTP برای دریافت درخواست‌های Webhook
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		update := tgbotapi.Update{}
		err := json.NewDecoder(r.Body).Decode(&update)
		if err != nil {
			http.Error(w, "Error decoding update", http.StatusBadRequest)
			return
		}

		// پردازش پیام
		if update.Message == nil {
			return
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
	})

	// شروع HTTP Server
	log.Fatal(http.ListenAndServe(":8080", nil))
}
