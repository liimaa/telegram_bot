import config from "./config"
import TelegramBot from "node-telegram-bot-api"
import constants from "./constants"
import { removeFileExt, convert_media, media_clenup } from "./util"
import fs from "fs"
import { uploadGfycat } from "./features/gfycat"

const bot = new TelegramBot(config.BOT_TOKEN, { polling: true })

bot.on("text", msg => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId, "Received your message")
})

// convert webm -> mp4
bot.on("document", async ({ document, chat }) => {
  if (!/[\w|\d]*\.webm/.test(document.file_name)) return
  const filename = removeFileExt(document.file_name)
  const filepath = `${constants.webm_dir}/${filename}.mp4`
  console.log(filename, filepath, "\n")
  try {
    const mediaStream = bot.getFileStream(document.file_id)
    await convert_media(mediaStream, filepath)

    if (document.file_size > config.MAXSIZEBYTES) {
      const url = await uploadGfycat(filepath, filename)
      bot.sendMessage(chat.id, url, { disable_notification: true })
      return
    } 
    await bot.sendVideo(chat.id, filepath, { disable_notification: true })
    media_clenup(filepath)
  } catch (error) {
    media_clenup(filepath)
    console.log(error)
  }
})
