const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  }
}, {
  timestamps: true
});

// City name already has unique: true, no need for separate index

module.exports = mongoose.model('City', citySchema);
