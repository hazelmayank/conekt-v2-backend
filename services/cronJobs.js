const cron = require('node-cron');
const Campaign = require('../models/Campaign');
const Playlist = require('../models/Playlist');
const Truck = require('../models/Truck');

// Auto-expire campaigns (runs at midnight daily)
const expireCampaigns = async () => {
  try {
    console.log('Starting campaign expiry job...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredCampaigns = await Campaign.find({
      end_date: { $lt: today },
      status: 'active'
    });

    if (expiredCampaigns.length > 0) {
      await Campaign.updateMany(
        { end_date: { $lt: today }, status: 'active' },
        { status: 'expired' }
      );

      console.log(`Expired ${expiredCampaigns.length} campaigns`);
    } else {
      console.log('No campaigns to expire');
    }
  } catch (error) {
    console.error('Campaign expiry job error:', error);
  }
};

// Generate playlists (runs at 5 PM daily)
const generatePlaylists = async () => {
  try {
    console.log('Starting playlist generation job...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Get all trucks
    const trucks = await Truck.find({});
    
    for (const truck of trucks) {
      try {
        // Get active campaigns for tomorrow
        const campaigns = await Campaign.find({
          truck_id: truck._id,
          start_date: { $lte: tomorrow },
          end_date: { $gte: tomorrow },
          status: 'active'
        }).populate('video_id').sort({ play_order: 1 });

        // Create playlist data
        const playlistData = {
          truck_id: truck._id,
          date: tomorrow,
          campaign_ids: campaigns.map(c => c._id),
          playlist_data: campaigns.map(campaign => ({
            id: campaign._id,
            type: 'video',
            url: campaign.video_url,
            checksum: campaign.video_id?.checksum || '',
            duration: campaign.video_id?.duration_sec || 0,
            loop: true,
            play_order: campaign.play_order
          })),
          version: `${Date.now()}-${campaigns.length}`,
          push_status: 'pending'
        };

        // Create or update playlist
        await Playlist.findOneAndUpdate(
          { truck_id: truck._id, date: tomorrow },
          playlistData,
          { upsert: true, new: true }
        );

        console.log(`Generated playlist for truck ${truck.truck_number}: ${campaigns.length} campaigns`);
      } catch (error) {
        console.error(`Error generating playlist for truck ${truck.truck_number}:`, error);
      }
    }

    console.log('Playlist generation job completed');
  } catch (error) {
    console.error('Playlist generation job error:', error);
  }
};

// Update truck status based on heartbeat (runs every 5 minutes)
const updateTruckStatus = async () => {
  try {
    console.log('Starting truck status update job...');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    console.log(`Checking trucks with last heartbeat before: ${tenMinutesAgo.toISOString()}`);
    
    // Update trucks that haven't sent heartbeat in 10 minutes
    const result = await Truck.updateMany(
      { last_heartbeat_at: { $lt: tenMinutesAgo } },
      { status: 'offline' }
    );

    console.log(`Truck status update completed. Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
    
    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} trucks to offline status`);
    } else {
      console.log('No trucks needed status update');
    }
  } catch (error) {
    console.error('Truck status update error:', error);
  }
};

// Clean up old audit logs (runs weekly)
const cleanupAuditLogs = async () => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const AuditLog = require('../models/AuditLog');
    const result = await AuditLog.deleteMany({
      createdAt: { $lt: threeMonthsAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} old audit logs`);
  } catch (error) {
    console.error('Audit log cleanup error:', error);
  }
};

// Clean up old playlists (runs weekly)
const cleanupPlaylists = async () => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const result = await Playlist.deleteMany({
      date: { $lt: oneMonthAgo },
      push_status: 'synced'
    });

    console.log(`Cleaned up ${result.deletedCount} old playlists`);
  } catch (error) {
    console.error('Playlist cleanup error:', error);
  }
};

// Schedule cron jobs
const scheduleJobs = () => {
  // Campaign expiry - daily at midnight
  cron.schedule('0 0 * * *', expireCampaigns, {
    timezone: 'Asia/Kolkata'
  });

  // Playlist generation - daily at 5 PM
  cron.schedule('0 17 * * *', generatePlaylists, {
    timezone: 'Asia/Kolkata'
  });

  // Truck status update - every 5 minutes
  cron.schedule('*/5 * * * *', updateTruckStatus, {
    timezone: 'Asia/Kolkata'
  });

  // Audit log cleanup - weekly on Sunday at 2 AM
  cron.schedule('0 2 * * 0', cleanupAuditLogs, {
    timezone: 'Asia/Kolkata'
  });

  // Playlist cleanup - weekly on Sunday at 3 AM
  cron.schedule('0 3 * * 0', cleanupPlaylists, {
    timezone: 'Asia/Kolkata'
  });

  console.log('Cron jobs scheduled successfully');
};

// Manual job execution functions (for testing)
const runJobs = {
  expireCampaigns,
  generatePlaylists,
  updateTruckStatus,
  cleanupAuditLogs,
  cleanupPlaylists
};

module.exports = {
  scheduleJobs,
  runJobs
};
