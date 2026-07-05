const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  imageUrl: { type: String, default: null },
  scheduledTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'posted', 'failed'],
    default: 'pending',
  },
  telegramMessageId: { type: String, default: null },
  errorMessage: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
