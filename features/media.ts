
const webmToMp4 = (params) => {
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
      return url
    } 
    await bot.sendVideo(chat.id, filepath, { disable_notification: true })
  } catch (error) {
    media_clenup(filepath)
    console.log(error)
  }
}