import axios from "axios"

const feed = async(id) => {
	const response = await axios({
		method: "GET",
		url: `https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`,
	})
	return response.data
}

export { feed }