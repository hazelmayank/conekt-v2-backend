const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  city_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: true
  },
  truck_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  route: {
    route_name: {
      type: String,
      required: true,
      trim: true
    },
    polyline: [{
      lat: Number,
      lng: Number
    }],
    polygon: [{
      lat: Number,
      lng: Number
    }]
  },
  controller_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  last_heartbeat_at: Date,
  last_sync_at: Date,
  gps_lat: Number,
  gps_lng: Number,
  storage_mb: {
    type: Number,
    default: 0
  },
  battery_percent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Hardware telemetry
  telemetry: {
    uptime: Number,
    cpu_usage: Number,
    memory_usage: Number,
    disk_free: Number,
    network_rssi: Number,
    temperature: Number,
    last_updated: Date
  },
  // Player status
  player_status: {
    status: {
      type: String,
      enum: ['playing', 'paused', 'stopped', 'error'],
      default: 'stopped'
    },
    current_item: String,
    position_sec: Number,
    playlist_version: String
  },
  // Error logs
  error_logs: [{
    time: Date,
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical']
    },
    message: String
  }]
}, {
  timestamps: true
});

// Indexes
truckSchema.index({ city_id: 1 });
// controller_id already has unique: true, no need for separate index
truckSchema.index({ status: 1 });
truckSchema.index({ last_heartbeat_at: 1 });

// Virtual for truck status calculation
truckSchema.virtual('isOnline').get(function() {
  if (!this.last_heartbeat_at) return false;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  return this.last_heartbeat_at > tenMinutesAgo;
});

module.exports = mongoose.model('Truck', truckSchema);
