const express = require('express');
const router = express.Router();
const { createPost, getPosts, getStats, updatePost, deletePost } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/stats', getStats);
router.get('/', getPosts);
router.post('/create', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

module.exports = router;
