import config from "./config"
import TelegramBot from "node-telegram-bot-api"
import constants from "./constants"
import { removeFileExt, convert_media, media_clenup } from "./util"

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true })

bot.on("text", msg => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId, "Received your message")
})


// convert webm -> mp4
bot.on("document", async ({ document, chat }) => {
  if (!/[\w|\d]*\.webm/.test(document.file_name)) return

  const filepath = `${constants.webm_dir}/${removeFileExt(
    document.file_name
  )}.mp4`

  try {
    const mediaStream = bot.getFileStream(document.file_id)
    await convert_media(mediaStream, filepath)
    await bot.sendVideo(chat.id, filepath, { disable_notification: true })
    media_clenup(filepath)
  } catch (error) {
    console.log(error)
  }
})
