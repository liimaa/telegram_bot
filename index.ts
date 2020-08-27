import config from "./config"
import TelegramBot from "node-telegram-bot-api"
import constants from "./constants"
import { removeFileExt, convert_media, media_clenup } from "./util"
import { uploadGfycat } from "./features/gfycat"
import { feed } from "./features/hackernews"
import { yammerMsgById } from "./features/yammer"

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


bot.onText(new RegExp('(https?:\\/\\/news\\.ycombinator\\.com\\/item\\?id=[\\d]+)'), async({ chat, from, message_id }, match) => {
  const link = match[0]
  const id = link.split('/item?id=')[1]
  const data = await feed(id)
  // await bot.deleteMessage(chat.id, message_id.toString())
  bot.sendMessage(chat.id, 
    link + "\n" +
    data.title + "\nscore " +
    data.score + " | " + data.type + " | " +
    '[article link]' + '(' + data.url + ')',
    { 
      parse_mode: "Markdown",
      disable_notification : true,
      disable_web_page_preview: true,
    }
  )
})

bot.onText(new RegExp('.*www\.yammer\.com\/.*\/threads\/show.*'), async({ chat, message_id, text}) => {
  try {
    const response = await yammerMsgById(text.replace(/[^0-9]/g, ""))
    bot.sendMessage(chat.id, 
      text + 
      "\n" +
      response.body.parsed +
      "\n"
    )
    // await bot.deleteMessage(chat.id, message_id.toString())
    // console.log("Deleted yammer msg", message_id);
  } catch (error) {
    console.log("Yammer error", error);
  }
})
