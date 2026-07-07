const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: {
    type: String,
    enum: ['twitter', 'linkedin', 'facebook', 'instagram', 'pinterest', 'facebook_page', 'linkedin_page', 'instagram_business'],
    required: true,
  },
  handle: { type: String, required: true },
  zeroAccountId: { type: String, required: true },
  accessToken: { type: String },
  refreshToken: { type: String },
  tokenExpiresAt: { type: Date },
  status: {
    type: String,
    enum: ['connected', 'disconnected'],
    default: 'connected',
  },
  avatarUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
