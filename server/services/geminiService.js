const axios = require('axios');

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
];

const generateCaption = async (topic, tone = 'professional') => {
  const prompt = `You are a social media expert. Generate a social media post caption on the topic: "${topic}".
Use a ${tone} tone of voice.
Include:
- An attention-grabbing opening with emoji
- 2-3 sentences of compelling, relevant content
- Relevant hashtags (5-7)
- A call to action
Keep it under 200 words. Format it nicely with line breaks.`;

  let lastError;

  for (const model of MODELS) {
    try {
      const response = await axios.post(
        `${BASE}/${model}:generateContent`,
        { contents: [{ parts: [{ text: prompt }] }] },
        {
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if (status !== 429 && status !== 503) break;
      console.warn(`[Gemini] ${model} returned ${status}, trying next model...`);
    }
  }

  const status = lastError?.response?.status;
  const msg = lastError?.response?.data?.error?.message || lastError?.message;
  console.error('[Gemini] Final error:', status, msg);

  if (status === 429) throw new Error('Gemini quota exceeded. Wait a moment and try again.');
  if (status === 401 || status === 403) throw new Error('Invalid Gemini API key.');
  throw new Error(msg || 'Gemini API request failed');
};

const generateImagePrompt = async (topic) => {
  const prompt = `Based on the following topic for a social media post, suggest a few visual search keywords to find a matching stock image.
Topic: "${topic}"
Output ONLY 2 or 3 keywords separated by commas (e.g. "code, programming, nextjs"). Do not include any other text or description.`;

  let lastError;

  for (const model of MODELS) {
    try {
      const response = await axios.post(
        `${BASE}/${model}:generateContent`,
        { contents: [{ parts: [{ text: prompt }] }] },
        {
          headers: {
            'x-goog-api-key': process.env.GEMINI_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if (status !== 429 && status !== 503) break;
      console.warn(`[Gemini] ${model} returned ${status}, trying next model...`);
    }
  }

  return 'workspace,coding';
};

module.exports = { generateCaption, generateImagePrompt };
