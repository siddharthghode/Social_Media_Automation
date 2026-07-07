const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  imageUrl: { type: String, default: null },
  mediaUrl: { type: String, default: null },
  mediaType: { type: String, default: null },
  scheduledTime: { type: Date, required: true },
  scheduledFor: { type: Date }, // support both field names
  platforms: { type: [String], default: [] },
  platform: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'posted', 'failed'],
    default: 'pending',
  },
  telegramMessageId: { type: String, default: null },
  zeroPostId: { type: String, default: null },
  errorMessage: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
