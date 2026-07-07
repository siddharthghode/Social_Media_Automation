const cron = require('node-cron');
const Post = require('../models/Post');
const Account = require('../models/Account');
const { sendMessage, sendImage } = require('../services/telegramService');
const { postToFacebook } = require('../services/facebookService');
const zernio = require('../config/zernio');

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
        console.log(`[Scheduler] Publishing post ${post._id}...`);
        const errors = [];

        const platforms = post.platforms && post.platforms.length > 0 ? post.platforms : ['telegram'];
        const telegramPlatforms = platforms.filter(p => p === 'telegram');
        const facebookPlatforms = platforms.filter(p => p === 'facebook');
        const zernioplatforms = platforms.filter(p => p !== 'facebook' && p !== 'telegram');

        // Telegram
        if (telegramPlatforms.length > 0) {
          try {
            let result;
            if (post.imageUrl) {
              result = await sendImage(post.imageUrl, post.content);
            } else {
              result = await sendMessage(post.content);
            }
            post.telegramMessageId = String(result.result?.message_id || result.message_id || '');
            console.log(`[Scheduler] Telegram published successfully`);
          } catch (err) {
            errors.push(`telegram: ${err.message}`);
            console.error(`[Scheduler] Telegram failed: ${err.message}`);
          }
        }

        // Facebook
        for (const _ of facebookPlatforms) {
          try {
            const fbAccount = await Account.findOne({ userId: post.userId, platform: 'facebook', status: 'connected' });
            if (!fbAccount) throw new Error('No connected Facebook account found');
            await postToFacebook(fbAccount.zeroAccountId, fbAccount.accessToken, post.content, post.imageUrl);
            console.log(`[Scheduler] Facebook published successfully`);
          } catch (err) {
            errors.push(`facebook: ${err.message}`);
            console.error(`[Scheduler] Facebook failed: ${err.message}`);
          }
        }

        // Zernio (Instagram, LinkedIn, Twitter, Pinterest)
        if (zernioplatforms.length > 0) {
          try {
            const accounts = await Account.find({
              userId: post.userId,
              platform: { $in: zernioplatforms },
              status: 'connected',
            });
            if (accounts.length === 0) throw new Error('No connected accounts for: ' + zernioplatforms.join(', '));

            const zPlatforms = accounts.map(a => ({ platform: a.platform, accountId: a.zeroAccountId }));
            const mediaItems = post.imageUrl ? [{ url: post.imageUrl, type: 'image' }] : [];

            const result = await zernio.posts.createPost({
              body: {
                content: post.content,
                platforms: zPlatforms,
                scheduledFor: post.scheduledTime.toISOString(),
                ...(mediaItems.length > 0 && { mediaItems }),
              },
            });
            post.zeroPostId = result.data?.post?._id || result.data?._id || '';
            console.log(`[Scheduler] Zernio published for: ${zernioplatforms.join(', ')}`);
          } catch (err) {
            errors.push(`${zernioplatforms.join(',')}: ${err.message}`);
            console.error(`[Scheduler] Zernio failed: ${err.message}`);
          }
        }

        // Mark posted if at least one platform succeeded, failed only if all failed
        const totalPlatforms = telegramPlatforms.length + facebookPlatforms.length + (zernioplatforms.length > 0 ? 1 : 0);
        if (errors.length === totalPlatforms) {
          post.status = 'failed';
          post.errorMessage = errors.join(' | ');
        } else {
          post.status = 'posted';
          if (errors.length > 0) post.errorMessage = 'Partial failure — ' + errors.join(' | ');
        }
        await post.save();
      }
    } catch (error) {
      console.error('[Scheduler] Cron error:', error.message);
    }
  });

  console.log('[Scheduler] Post scheduler started — checking every minute');
};

module.exports = { startScheduler };
