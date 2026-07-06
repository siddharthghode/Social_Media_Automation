const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

// ── Token helpers ─────────────────────────────────────────────
const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const sendTokens = (res, user) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  return { accessToken, refreshToken };
};

// ── POST /api/auth/register ───────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    let user = await User.findOne({ email });
    if (user && user.isVerified)
      return res.status(400).json({ message: 'Email already registered' });

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    if (user) {
      user.name = name;
      user.password = password;
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      user.otpResendCount = 0;
      user.otpResendWindowStart = new Date();
      await user.save();
    } else {
      user = await User.create({
        name, email, password, otp, otpExpiry,
        otpResendCount: 0, otpResendWindowStart: new Date(),
      });
    }

    await sendOtpEmail(email, otp);
    res.status(200).json({ message: 'OTP sent to your email', email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > user.otpExpiry)
      return res.status(400).json({ message: 'OTP expired. Please register again' });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpResendCount = 0;

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      _id: user._id, name: user.name, email: user.email,
      token: accessToken, refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/resend-otp ─────────────────────────────────
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });

    // Rate limit: max 3 resends per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (user.otpResendWindowStart && user.otpResendWindowStart > oneHourAgo) {
      if (user.otpResendCount >= 3)
        return res.status(429).json({ message: 'Too many OTP requests. Try again in 1 hour.' });
    } else {
      // Reset window
      user.otpResendCount = 0;
      user.otpResendWindowStart = new Date();
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otpResendCount += 1;
    await user.save();

    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP resent successfully', remaining: 3 - user.otpResendCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isVerified)
      return res.status(403).json({ message: 'Email not verified', email });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Keep max 5 refresh tokens (multi-device support)
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();

    res.json({
      _id: user._id, name: user.name, email: user.email, avatar: user.avatar,
      token: accessToken, refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh token required' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(token))
      return res.status(403).json({ message: 'Refresh token revoked' });

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (token) {
      const user = await User.findOne({ refreshTokens: token });
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
        await user.save();
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user || user.authProvider !== 'local') {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail(email, resetUrl);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' });

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    // Invalidate all refresh tokens on password reset
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────
const getMe = async (req, res) => {
  res.json(req.user);
};

// ── OAuth callback ────────────────────────────────────────────
const oauthCallback = async (req, res) => {
  const accessToken = generateAccessToken(req.user._id);
  const refreshToken = generateRefreshToken(req.user._id);

  const user = await User.findById(req.user._id);
  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) user.refreshTokens.shift();
  await user.save();

  res.redirect(
    `${process.env.CLIENT_URL}/oauth-success?token=${accessToken}&refreshToken=${refreshToken}&name=${encodeURIComponent(req.user.name)}&email=${encodeURIComponent(req.user.email)}`
  );
};

module.exports = {
  register, verifyOtp, resendOtp, login,
  refreshToken, logout,
  forgotPassword, resetPassword,
  getMe, oauthCallback,
};
