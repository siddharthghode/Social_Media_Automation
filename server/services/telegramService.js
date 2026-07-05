const axios = require('axios');

const BASE_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Send a text message to Telegram channel
const sendMessage = async (content) => {
  const response = await axios.post(`${BASE_URL}/sendMessage`, {
    chat_id: process.env.TELEGRAM_CHANNEL_ID,
    text: content,
    parse_mode: 'HTML',
  });
  return response.data;
};

// Send an image with caption to Telegram channel
const sendImage = async (imageUrl, caption) => {
  const response = await axios.post(`${BASE_URL}/sendPhoto`, {
    chat_id: process.env.TELEGRAM_CHANNEL_ID,
    photo: imageUrl,
    caption: caption,
    parse_mode: 'HTML',
  });
  return response.data;
};

module.exports = { sendMessage, sendImage };
