import config from "./config"
import TelegramBot from "node-telegram-bot-api"
import constants from "./constants"
import { removeFileExt, convert_media, media_clenup } from "./util"
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

bot.onText(new RegExp('https?:\\/\\/[^\\s]+.webm'), async ({ document, chat }, match) => {
  const link = match[0]
  const filename = path.basename(url.parse(match[0]).path);
  const filepath = `${constants.webm_dir}/${filename}.mp4`

  const response = await Axios.get(link, { responseType: 'stream' })
  response.data.pipe(fs.createWriteStream(filepath));



  // return
  // const c = response.headers["content-disposition"]
  // let filename = ""
  // if(c && /^attachment/i.test(c)) {
  //   filename = c.toLowerCase()
  //     .split('filename=')[1]
  //     .split(';')[0]
  //     .replace(/"/g, '');
  // } else {
  //   filename = path.basename(url.parse(match[0]).path);
  // }
  // console.log(filename);
  // const filepath = `${constants.webm_dir}/${filename}.mp4`
  // fs.createWriteStream(filepath)


})


// telegram.onText(), function (msg, match) {
//   let filename;
//       let r = request(match[0]).on('response', function (res) {
//           let contentDisp = res.headers['content-disposition'];
//           if (contentDisp && /^attachment/i.test(contentDisp)) {
//               filename = contentDisp.toLowerCase()
//                   .split('filename=')[1]
//                   .split(';')[0]
//                   .replace(/"/g, '');
//           } else {
//               filename = path.basename(url.parse(match[0]).path);
//           }
//           console.log(filename);
//           r.pipe(fs.createWriteStream(path.join(__dirname, filename)));
//       });

//       r.on('end', function () {
//           ffmpeg(filename)
//               .output(filename + '.mp4')
//               .outputOptions('-strict -2') // Needed since axc is "experimental"
//               .on('end', () => {
//                   // Cleanup
//                   fs.unlink(filename, (e) => {
//                       if (e) {
//                           console.error(e);
//                       }
//                   });
//                   console.log('[webm2mp4] File', filename, 'converted - Uploading...');
//                   telegram.sendVideo(msg.chat.id, filename + '.mp4', { disable_notification : true }).then(function() {
//                       fs.unlink(filename + '.mp4', (e) => {
//                           if (e) {
//                               console.error(e);
//                           }
//                       });
//                   });
//               })
//               .on('error', (e) => {
//                   console.error(e);
//                   // Cleanup
//                   fs.unlink(filename, (err) => {
//                       if (err) {
//                           console.error(err);
//                       }
//                   });
//                   fs.unlink(filename + '.mp4', (err) => {
//                       if (err) {
//                           console.error(err);
//                       }
//                   });
//               })
//               .run();
//   });
// });



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
