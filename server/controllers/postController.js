const Post = require('../models/Post');
const Account = require('../models/Account');

// POST /api/posts/create
const createPost = async (req, res) => {
  try {
    const { content, imageUrl, mediaUrl, mediaType, scheduledTime, scheduledFor, platforms, platform } = req.body;
    
    const finalScheduledTime = scheduledTime || scheduledFor;
    if (!content || !finalScheduledTime)
      return res.status(400).json({ message: 'Content and scheduled time are required' });

    const post = await Post.create({
      userId: req.user._id,
      content,
      imageUrl: imageUrl || mediaUrl || null,
      mediaUrl: mediaUrl || imageUrl || null,
      mediaType: mediaType || (imageUrl || mediaUrl ? 'image' : null),
      scheduledTime: new Date(finalScheduledTime),
      scheduledFor: new Date(finalScheduledTime),
      platforms: platforms || (platform ? [platform] : []),
      platform: platform || (platforms && platforms.length > 0 ? platforms[0] : ''),
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/posts
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/posts/stats
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, pending, posted, failed, connectedAccounts] = await Promise.all([
      Post.countDocuments({ userId }),
      Post.countDocuments({ userId, status: 'pending' }),
      Post.countDocuments({ userId, status: 'posted' }),
      Post.countDocuments({ userId, status: 'failed' }),
      Account.countDocuments({ userId, status: 'connected' }),
    ]);
    res.json({ total, pending, posted, failed, connectedAccounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/posts/:id
const updatePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.status !== 'pending')
      return res.status(400).json({ message: 'Only pending posts can be edited' });

    const { content, imageUrl, mediaUrl, mediaType, scheduledTime, scheduledFor, platforms, platform } = req.body;
    if (content) post.content = content;
    if (imageUrl !== undefined) post.imageUrl = imageUrl;
    if (mediaUrl !== undefined) post.mediaUrl = mediaUrl;
    if (mediaType !== undefined) post.mediaType = mediaType;
    
    const finalSched = scheduledTime || scheduledFor;
    if (finalSched) {
      post.scheduledTime = new Date(finalSched);
      post.scheduledFor = new Date(finalSched);
    }
    if (platforms !== undefined) post.platforms = platforms;
    if (platform !== undefined) post.platform = platform;

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/posts/:id
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPost, getPosts, getStats, updatePost, deletePost };
