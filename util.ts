import Ffmpeg from "fluent-ffmpeg"
import fs from "fs"

const convert_media = (stream, path): Promise<string> => {
  return new Promise((resolve, reject) => {
    Ffmpeg(stream)
      .on("error", error => reject(error.message))
      .on("end", () => resolve("Transcoding finished"))
      .save(path)
  })
}

const media_clenup = (path) => {
  return fs.unlinkSync(path)
}

const removeFileExt = (filename): string => {
  return filename.split(".").slice(0, -1).join(".")
}

export { removeFileExt, convert_media, media_clenup }
