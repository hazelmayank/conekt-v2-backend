const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create_campaign',
      'update_campaign',
      'delete_campaign',
      'reorder_campaigns',
      'push_playlist',
      'upload_video',
      'login',
      'logout',
      'create_truck',
      'update_truck',
      'delete_truck'
    ]
  },
  entity_type: {
    type: String,
    required: true,
    enum: ['campaign', 'truck', 'playlist', 'video', 'user', 'city']
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip_address: String,
  user_agent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
auditLogSchema.index({ user_id: 1, timestamp: -1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
