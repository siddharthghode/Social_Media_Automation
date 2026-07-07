const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  generateOUrl,
  syncAccounts,
  getConnectedAccounts,
  disconnectAccount,
  mockCallback,
} = require('../controllers/socialAuthController');

router.get('/auth/url/:platform', protect, generateOUrl);
router.get('/accounts/sync', protect, syncAccounts);
router.get('/accounts', protect, getConnectedAccounts);
router.delete('/accounts/:id', protect, disconnectAccount);

// Mock callback route
router.get('/auth/callback/mock', mockCallback);

module.exports = router;
