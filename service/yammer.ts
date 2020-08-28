import axios from "axios"
import config from "../config"

const yammerMsgById = async(id) => {
  const response = await axios.get("https://www.yammer.com/api/v1/messages/" + id + ".json", {
      headers: {
        Authorization: `Bearer ${config.YAMMER_ID}`,
      },
  })
  return response.data
}

export { yammerMsgById }
