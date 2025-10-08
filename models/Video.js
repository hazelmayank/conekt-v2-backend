const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  video_url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  duration_sec: {
    type: Number,
    required: true,
    min: 1
  },
  file_size_mb: {
    type: Number,
    required: true,
    min: 0
  },
  cloudinary_public_id: String,
  checksum: String,
  resolution: {
    width: Number,
    height: Number
  },
  format: String,
  bitrate: Number
}, {
  timestamps: true
});

// Index for filename
videoSchema.index({ filename: 1 });
videoSchema.index({ cloudinary_public_id: 1 });

module.exports = mongoose.model('Video', videoSchema);
