const cron = require('node-cron');
const Post = require('../models/Post');
const { sendMessage, sendImage } = require('../services/telegramService');

const startScheduler = () => {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const duePosts = await Post.find({
        status: 'pending',
        scheduledTime: { $lte: now },
      });

      if (duePosts.length === 0) return;
      console.log(`[Scheduler] Found ${duePosts.length} post(s) to publish`);

      for (const post of duePosts) {
        try {
          let result;
          if (post.imageUrl) {
            result = await sendImage(post.imageUrl, post.content);
          } else {
            result = await sendMessage(post.content);
          }

          post.status = 'posted';
          post.telegramMessageId = String(result.result.message_id);
          await post.save();
          console.log(`[Scheduler] Post ${post._id} published successfully`);
        } catch (err) {
          post.status = 'failed';
          post.errorMessage = err.message;
          await post.save();
          console.error(`[Scheduler] Post ${post._id} failed: ${err.message}`);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Cron error:', error.message);
    }
  });

  console.log('[Scheduler] Post scheduler started — checking every minute');
};

module.exports = { startScheduler };
