const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  truck_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Truck',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  campaign_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }],
  playlist_data: [{
    id: mongoose.Schema.Types.ObjectId,
    type: {
      type: String,
      default: 'video'
    },
    url: String,
    checksum: String,
    duration: Number,
    loop: {
      type: Boolean,
      default: true
    },
    play_order: Number
  }],
  version: {
    type: String,
    default: '1.0'
  },
  pushed_at: Date,
  push_status: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'pending'
  },
  push_attempts: {
    type: Number,
    default: 0
  },
  last_error: String
}, {
  timestamps: true
});

// Compound unique index for truck_id and date
playlistSchema.index({ truck_id: 1, date: 1 }, { unique: true });

// Indexes
playlistSchema.index({ truck_id: 1 });
playlistSchema.index({ date: 1 });
playlistSchema.index({ push_status: 1 });

// Pre-save middleware to generate playlist_data from campaign_ids
playlistSchema.pre('save', async function(next) {
  if (this.campaign_ids && this.campaign_ids.length > 0) {
    try {
      const Campaign = mongoose.model('Campaign');
      const Video = mongoose.model('Video');
      
      const campaigns = await Campaign.find({ 
        _id: { $in: this.campaign_ids },
        status: 'active'
      }).populate('video_id').sort({ play_order: 1 });

      this.playlist_data = campaigns.map(campaign => ({
        id: campaign._id,
        type: 'video',
        url: campaign.video_url,
        checksum: campaign.video_id?.checksum || '',
        duration: campaign.video_id?.duration_sec || 0,
        loop: true,
        play_order: campaign.play_order
      }));

      // Generate version based on timestamp and campaign count
      this.version = `${Date.now()}-${campaigns.length}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Playlist', playlistSchema);
