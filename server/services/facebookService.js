const axios = require('axios');

const BASE = 'https://graph.facebook.com/v19.0';

const postToFacebook = async (pageId, accessToken, content, imageUrl = null) => {
  if (imageUrl) {
    const { data } = await axios.post(`${BASE}/${pageId}/photos`, {
      url: imageUrl,
      caption: content,
      access_token: accessToken,
    });
    return data;
  }
  const { data } = await axios.post(`${BASE}/${pageId}/feed`, {
    message: content,
    access_token: accessToken,
  });
  return data;
};

module.exports = { postToFacebook };
