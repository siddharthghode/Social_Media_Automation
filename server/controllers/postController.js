const Post = require('../models/Post');

// POST /api/posts/create
const createPost = async (req, res) => {
  try {
    const { content, imageUrl, scheduledTime } = req.body;
    if (!content || !scheduledTime)
      return res.status(400).json({ message: 'Content and scheduled time are required' });

    const post = await Post.create({
      userId: req.user._id,
      content,
      imageUrl: imageUrl || null,
      scheduledTime: new Date(scheduledTime),
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
    const [total, pending, posted, failed] = await Promise.all([
      Post.countDocuments({ userId }),
      Post.countDocuments({ userId, status: 'pending' }),
      Post.countDocuments({ userId, status: 'posted' }),
      Post.countDocuments({ userId, status: 'failed' }),
    ]);
    res.json({ total, pending, posted, failed });
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

    const { content, imageUrl, scheduledTime } = req.body;
    if (content) post.content = content;
    if (imageUrl !== undefined) post.imageUrl = imageUrl;
    if (scheduledTime) post.scheduledTime = new Date(scheduledTime);
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
