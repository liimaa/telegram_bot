import { config, botConf } from "./config"
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

// bot.on("text", msg => {
//   const chatId = msg.chat.id
//   bot.sendMessage(chatId, "Received your message")
// })

// convert webm -> mp4
bot.on("document", async ({ document, chat }) => {
  if (!/[\w|\d]*\.webm/.test(document.file_name)) return
  const filename = removeFileExt(document.file_name)
  const filepath = `${constants.webm_dir}/${filename}.mp4`
  const mediaStream = bot.getFileStream(document.file_id)
  const filesize = document.file_size 

  await convert_media(mediaStream, filepath).catch(console.error)

  if (filesize > config.MAXSIZEBYTES) {
    const gfycatUrl = await uploadGfycat(filepath, filename)
    bot.sendMessage(chat.id, gfycatUrl, { disable_notification: true })
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
      "\n", {
        disable_notification: true,
      }
    )
    // await bot.deleteMessage(chat.id, message_id.toString())
    // console.log("Deleted yammer msg", message_id);
  } catch (error) {
    console.log("Yammer error", error);
  }
})

bot.onText(new RegExp(/\/cmdlist|\/help/, 'g'), async({ chat, message_id }) => {
  let cmdlist = 'Command <argument type | options | current option>\n' +
    '\nTo set new options use: /command <options>\n' +
    'Sample command: /convertQuality 1 sets quality to best\n' +
    '\nCurrent commandlist:'
  for (const key in botConf) {
    cmdlist += `\n/${key} <${botConf[key][0]} | ${botConf[key][1]} | ${botConf[2]}>\n`
  }
  bot.sendMessage(chat.id, cmdlist, {
    reply_to_message_id: message_id,
    disable_notification: true,
  })
})


for (let key in botConf) {
  let [argumentType, options, currentOption] = botConf[key]
  bot.onText(new RegExp(`(/${key}|/${key}@\\w+) (\\w+|\\d+)`, 'g'), async({ chat, text, message_id, from}) => {
    const [command, params] = text.split(" ")
    if(currentOption === params) {
      const msg = `Error ! /${key} is already set to ${params}.`
      bot.sendMessage(chat.id, msg, {
        reply_to_message_id: message_id,
        disable_notification: true,
      })
      console.log(`${msg} ${from.first_name}`);
    } else if (argumentType.test(params)) {     
      const msg = `Changed param /${key} ${currentOption} to ${params} successfully.`
      currentOption = params
      bot.sendMessage(chat.id, msg, {
        reply_to_message_id: message_id,
        disable_notification: true,
      })
      console.log(`${msg} ${from.first_name}`)
    } else {
      const msg = `Error ! Command uses type options: <${options}> !`
      bot.sendMessage(chat.id, msg, {
        reply_to_message_id: message_id,
        disable_notification: true,
      })
      console.log(`${msg} ${from.first_name}`)
    }
  })
}