const { generateCaption, generateImagePrompt } = require('../services/geminiService');

// POST /api/ai/generate-caption (kept for compatibility)
const generateCaptionHandler = async (req, res) => {
  try {
    const { topic, prompt, tone, generateImage } = req.body;
    const finalTopic = topic || prompt;
    if (!finalTopic) return res.status(400).json({ message: 'Topic/prompt is required' });

    const caption = await generateCaption(finalTopic, tone || 'professional');

    let mediaUrl = null;
    if (generateImage) {
      const keywords = await generateImagePrompt(finalTopic);
      const cleanKeywords = keywords.replace(/[^a-zA-Z,]/g, '').trim().toLowerCase() || 'coding,workspace';
      
      // Default fallback
      mediaUrl = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80';
      
      const keywordList = cleanKeywords.split(',').map(k => k.trim());
      if (keywordList.some(k => k.includes('book') || k.includes('library') || k.includes('read'))) {
        mediaUrl = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80';
      } else if (keywordList.some(k => k.includes('nextjs') || k.includes('code') || k.includes('program') || k.includes('soft') || k.includes('dev') || k.includes('react'))) {
        mediaUrl = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80';
      } else if (keywordList.some(k => k.includes('fit') || k.includes('gym') || k.includes('health') || k.includes('sport'))) {
        mediaUrl = 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80';
      } else if (keywordList.some(k => k.includes('food') || k.includes('cook') || k.includes('recipe') || k.includes('eat'))) {
        mediaUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80';
      } else if (keywordList.some(k => k.includes('market') || k.includes('busin') || k.includes('financ') || k.includes('invest') || k.includes('money'))) {
        mediaUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80';
      } else if (keywordList.some(k => k.includes('music') || k.includes('song') || k.includes('band'))) {
        mediaUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80';
      } else if (keywordList.some(k => k.includes('travel') || k.includes('vacat') || k.includes('trip') || k.includes('nature') || k.includes('beach'))) {
        mediaUrl = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';
      }
    }

    res.json({ caption, mediaUrl });
  } catch (error) {
    res.status(500).json({ message: 'AI generation failed: ' + error.message });
  }
};

module.exports = {
  generateCaptionHandler,
  generatePostHandler: generateCaptionHandler, // expose both
};
