import "dotenv/config"

const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  MAXSIZEBYTES: process.env.MAXSIZEBYTES, 
  GFYCAT_client_id: process.env.GFYCAT_client_id,
  GFYCAT_client_secret: process.env.GFYCAT_client_secret
}

export default config