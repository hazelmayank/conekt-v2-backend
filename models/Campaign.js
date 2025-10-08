const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  truck_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Truck',
    required: true
  },
  campaign_name: {
    type: String,
    required: true,
    trim: true
  },
  company_name: {
    type: String,
    required: true,
    trim: true
  },
  video_url: {
    type: String,
    required: true
  },
  video_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  package_type: {
    type: String,
    enum: ['half_month', 'full_month'],
    required: true
  },
  play_order: {
    type: Number,
    min: 1,
    max: 7,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  // Additional metadata
  booking_cycle: {
    cycle_number: Number, // 1 or 2
    month: Number,
    year: Number
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ truck_id: 1, start_date: 1, end_date: 1 });
campaignSchema.index({ truck_id: 1, status: 1 });
campaignSchema.index({ start_date: 1, end_date: 1 });
campaignSchema.index({ play_order: 1 });

// Compound index for unique play_order per truck per active period
campaignSchema.index({ 
  truck_id: 1, 
  play_order: 1, 
  status: 1, 
  start_date: 1, 
  end_date: 1 
});

// Validation middleware
campaignSchema.pre('save', function(next) {
  // Validate start_date is 1st or 16th of month
  const startDay = this.start_date.getDate();
  if (startDay !== 1 && startDay !== 16) {
    return next(new Error('Campaigns can only start on 1st or 16th of each month'));
  }

  // Prevent full_month packages from starting on 16th
  if (this.package_type === 'full_month' && startDay === 16) {
    return next(new Error('Full month campaigns can only start on 1st of month (1-30 days)'));
  }

  // Validate package_type logic
  if (this.package_type === 'half_month') {
    if (startDay === 1) {
      // Should end on 15th
      const expectedEnd = new Date(this.start_date);
      expectedEnd.setDate(15);
      if (this.end_date.getTime() !== expectedEnd.getTime()) {
        return next(new Error('Half month campaigns starting on 1st must end on 15th'));
      }
    } else if (startDay === 16) {
      // Should end on 30th of same month (treating all months as 30 days)
      const expectedEnd = new Date(this.start_date);
      expectedEnd.setDate(30);
      if (this.end_date.getTime() !== expectedEnd.getTime()) {
        return next(new Error('Half month campaigns starting on 16th must end on 30th of the same month'));
      }
    }
  } else if (this.package_type === 'full_month') {
    if (startDay !== 1) {
      return next(new Error('Full month campaigns must start on 1st of month'));
    }
    // Should end on 30th of same month (treating all months as 30 days)
    const expectedEnd = new Date(this.start_date);
    expectedEnd.setDate(30);
    if (this.end_date.getTime() !== expectedEnd.getTime()) {
      return next(new Error('Full month campaigns must end on 30th of the same month'));
    }
  }

  // Calculate booking cycle metadata
  this.booking_cycle = {
    cycle_number: startDay === 1 ? 1 : 2,
    month: this.start_date.getMonth() + 1,
    year: this.start_date.getFullYear()
  };

  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
