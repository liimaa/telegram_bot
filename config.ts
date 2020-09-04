import "dotenv/config"

const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  MAXSIZEBYTES: parseInt(process.env.MAXSIZEBYTES), 
  GFYCAT_client_id: process.env.GFYCAT_client_id,
  GFYCAT_client_secret: process.env.GFYCAT_client_secret,
  YAMMER_ID: process.env.YAMMER_ID,
}



const botConf = {
  convert_quality: [
    new RegExp(/\d+/),
    "1 - 48", // ffmpeg conversion quality from best -> worst 0 - 48
    process.env.convert_quality || "16",
  ],
}

export { config, botConf }