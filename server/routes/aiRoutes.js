const express = require('express');
const router = express.Router();
const { generateCaptionHandler } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate-caption', protect, generateCaptionHandler);

module.exports = router;
