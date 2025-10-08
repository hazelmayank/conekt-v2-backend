const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^\+91[6-9]\d{9}$/
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLoginAt: Date,
  // Twilio verification tracking
  verificationSid: String,
  lastOTPSentAt: Date
}, {
  timestamps: true
});

// Phone field already has unique: true, no need for separate index

module.exports = mongoose.model('User', userSchema);
