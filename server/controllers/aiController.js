const { generateCaption } = require('../services/geminiService');

// POST /api/ai/generate-caption
const generateCaptionHandler = async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ message: 'Topic is required' });

    const caption = await generateCaption(topic);
    res.json({ caption });
  } catch (error) {
    res.status(500).json({ message: 'AI generation failed: ' + error.message });
  }
};

module.exports = { generateCaptionHandler };
