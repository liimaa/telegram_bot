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

const uploadGfycat = async function (filepath: string, filename: string) {
  try {
    const gfycatUrl = await create_upload_url(filename)
    await upload(filepath, gfycatUrl)
    media_clenup(filepath)
  } catch (error) {
    console.log("Gfycat error", error)
    media_clenup(filepath)
  }
}

export { uploadGfycat }