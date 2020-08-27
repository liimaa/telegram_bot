import axios from "axios"
import { media_clenup } from "../util"
import config from "../config"
import fs from "fs"

const auth = async () => {
  const response = await axios({
    method: "POST",
    url: "https://api.gfycat.com/v1/oauth/token",
    data: {
      grant_type: "client_credentials",
      client_id: config.GFYCAT_client_id,
      client_secret: config.GFYCAT_client_secret,
    },
  })
  return response.data
}

const create_upload_url = async (filename: string): Promise<string> => {
  const response = await axios({
    method: "POST",
    url: "https://api.gfycat.com/v1/gfycats",
    data: {
      title: filename,
      // noMd5: false,
      keepAudio: true,
    },
    headers: {
      Authorization: `Bearer ${(await auth()).data.access_token}`,
    },
  })
  return response.data.gfyname
}

const upload = async (filepath: string, gfycatUrl: string) => {
  const response = await axios({
    method: "PUT",
    url: `https://filedrop.gfycat.com/${gfycatUrl}`,
    data: fs.createReadStream(filepath),
    headers: {
      // "Authorization": 'Bearer ' + auth.data.access_token,
      "Content-Type": "video/webm",
      "Content-Length": fs.statSync(filepath).size,
    },
    onUploadProgress: function (progressEvent) {
      // console.log("progressEvent", progressEvent)
    },
  })
  return response.data
}

const url_status = async (gfycatUrl: string) => {
  const response = await axios({
    url: `https://api.gfycat.com/v1/gfycats/fetch/status/${gfycatUrl}`,
    headers: {
      Authorization: `Bearer ${(await auth()).data.access_token}`,
    },
  })
  return response.data
}

const responseTypes = data => {
  // video
  if (data.content_urls && data.content_urls.mp4 && data.content_urls.mp4.url) {
    return data.content_urls.mp4.url
  } else if (
    data.content_urls &&
    data.content_urls.mobile &&
    data.content_urls.mobile.url
  ) {
    return data.content_urls.mobile.url
  }
  // gif
  if (data.mp4Url && !data.hasAudio) {
    return data.mp4Url
  } else if (data.mobileUrl && !data.hasAudio) {
    return data.mobileUrl
    // fallbacks
  } else if (data.miniUrl) {
    return data.miniUrl
  }
  if (data.task === "complete") {
    return `https://giant.gfycat.com/${data.gfycatFilepath}.mp4`
  }
  console.log(
    `could not found matching url | clear https://gfycat.com/${data.gfycatFilepath}`
  )
  return false
}

const uploadGfycat = async function (filepath: string, filename: string): Promise<string> {
  try {
    const gfycatUrl = await create_upload_url(filename)
    await upload(filepath, gfycatUrl)
    return new Promise((resolve, reject) => {
      let interval = setInterval(async () => {
        const status = await url_status(gfycatUrl)
        if (status.md5Found !== 1 && !status.content_urls) return
        const video_url = responseTypes(status)
        if (video_url) {
          clearInterval(interval)
          resolve(video_url)
          media_clenup(filepath)
        }
      }, 5000)
    })
  } catch (error) {
    console.log("Gfycat error", error)
    media_clenup(filepath)
  }
}

export { uploadGfycat }
