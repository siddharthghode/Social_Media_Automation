const express = require('express');
const router = express.Router();
const { generateCaptionHandler, generatePostHandler } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate-caption', protect, generateCaptionHandler);
router.post('/generate-post', protect, generatePostHandler);

module.exports = router;
