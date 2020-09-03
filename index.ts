import { config } from "./config"
import TelegramBot from "node-telegram-bot-api"
import constants from "./constants"
import { removeFileExt, convert_media, media_clenup, progress } from "./util"
import { uploadGfycat } from "./service/gfycat"
import { feed } from "./service/hackernews"
import { yammerMsgById } from "./service/yammer"
import Axios from "axios"
import path from 'path';
import fs from 'fs';
import url from 'url';

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
  const mediaStream = bot.getFileStream(document.file_id)
  const filesize = document.file_size 

  await convert_media(mediaStream, filepath).catch(console.error)

  if (filesize > config.MAXSIZEBYTES) {
    const url = await uploadGfycat(filepath, filename)
    bot.sendMessage(chat.id, url, { disable_notification: true })
      .catch(error => {
        console.log(error.response.body)
        media_clenup(filepath)
      })
    return
  } 
  bot.sendVideo(chat.id, filepath, { disable_notification: true })
    .catch(error => {
      console.log(error.response.body)
      media_clenup(filepath)
    })
})


bot.onText(new RegExp('https?:\\/\\/[^\\s]+.webm'), async ({ chat }, match) => {
  const link = match[0]
  const filename = path.basename(url.parse(match[0]).path)
  const filepath = `${constants.webm_dir}/${filename}`
  const file = fs.createWriteStream(filepath)

  const { data, headers } = await Axios.get(link, { responseType: "stream" })
  const size = Number(headers['content-length'])
  
  progress(data, size)
  data.pipe(file)

  file.on("close", async () => {
      const mp4File = `${removeFileExt(filepath)}.mp4`
      const readFile = fs.createReadStream(filepath)

      await convert_media(readFile, mp4File, filepath).catch(console.error)
      await bot.sendVideo(chat.id, mp4File, { disable_notification: true })
        .catch(error => {
          console.log(error.response.body)
          media_clenup(mp4File)
        })
      media_clenup(mp4File)
    })
    .on("error", () => media_clenup(filepath))
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
