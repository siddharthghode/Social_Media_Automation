const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const Account = require('../models/Account');
const { sendOtpEmail } = require('../services/emailService');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// POST /api/auth/register — create unverified user and send OTP
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    let user = await User.findOne({ email });

    if (user && user.isVerified)
      return res.status(400).json({ message: 'Email already registered' });

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    if (user) {
      // Resend OTP to unverified user
      user.name = name;
      user.password = password;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();
    } else {
      user = await User.create({ name, email, password, otp, otpExpiry });
    }

    await sendOtpEmail(email, otp);
    res.status(200).json({ message: 'OTP sent to your email', email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ message: 'OTP expired. Please register again' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isVerified)
      return res.status(403).json({ message: 'Email not verified', email });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

// GET /api/auth/google/callback & /api/auth/github/callback & /api/auth/facebook/callback
const oauthCallback = async (req, res) => {
  // req.user is either a User doc (google/github) or { user, accessToken, fbUserId, fbName } (facebook)
  const userData = req.user;
  const user = userData.user || userData;
  const token = generateToken(user._id);

  // If Facebook — fetch pages and save as connected account
  if (userData.accessToken && userData.fbUserId) {
    try {
      const pagesRes = await axios.get(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${userData.accessToken}`
      );
      const pages = pagesRes.data?.data || [];
      for (const page of pages) {
        await Account.findOneAndUpdate(
          { userId: user._id, platform: 'facebook', handle: page.name },
          {
            userId: user._id,
            platform: 'facebook',
            handle: page.name,
            zeroAccountId: page.id,
            accessToken: page.access_token,
            status: 'connected',
            avatarUrl: `https://graph.facebook.com/${page.id}/picture?type=square`,
          },
          { upsert: true, new: true }
        );
      }
      // If no pages, save the user profile itself
      if (pages.length === 0) {
        await Account.findOneAndUpdate(
          { userId: user._id, platform: 'facebook', zeroAccountId: userData.fbUserId },
          {
            userId: user._id,
            platform: 'facebook',
            handle: userData.fbName || 'facebook_user',
            zeroAccountId: userData.fbUserId,
            accessToken: userData.accessToken,
            status: 'connected',
            avatarUrl: `https://graph.facebook.com/${userData.fbUserId}/picture?type=square`,
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.error('[Facebook] Failed to fetch pages:', err.message);
    }
  }

  res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
};

module.exports = { register, verifyOtp, resendOtp, login, getMe, oauthCallback };
