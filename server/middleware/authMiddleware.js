const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authorized, no token' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password -refreshTokens -otp -resetPasswordToken');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (err) {
    // Distinguish expired vs invalid for frontend to know when to refresh
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Token expired', expired: true });
    res.status(401).json({ message: 'Token invalid' });
  }
};

module.exports = { protect };
