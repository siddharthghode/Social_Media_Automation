const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { register, verifyOtp, resendOtp, login, getMe, oauthCallback } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Local auth
router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/me', protect, getMe);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`, session: false }),
  oauthCallback
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.CLIENT_URL}/login?error=github_failed`, session: false }),
  oauthCallback
);

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email', 'pages_show_list', 'pages_manage_posts', 'pages_read_engagement'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: `${process.env.CLIENT_URL}/login?error=facebook_failed`, session: false }),
  oauthCallback
);

module.exports = router;
