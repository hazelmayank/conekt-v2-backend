const express = require('express');
const router = express.Router();
const Truck = require('../../models/Truck');
const Playlist = require('../../models/Playlist');
const Campaign = require('../../models/Campaign');

// Hardware authentication middleware (simple device ID validation)
const authenticateHardware = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'] || req.body.device_id;
    
    if (!deviceId) {
      return res.status(401).json({
        success: false,
        message: 'Device ID required'
      });
    }

    // Find truck by controller_id
    const truck = await Truck.findOne({ controller_id: deviceId });
    if (!truck) {
      return res.status(401).json({
        success: false,
        message: 'Invalid device ID'
      });
    }

    req.truck = truck;
    next();
  } catch (error) {
    console.error('Hardware auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Send heartbeat status
router.post('/status', authenticateHardware, async (req, res) => {
  try {
    const {
      device_id,
      status,
      uptime,
      gps_lat,
      gps_lng,
      storage_mb,
      battery_percent,
      telemetry,
      player_status,
      errors
    } = req.body;

    const truck = req.truck;

    // Update truck status
    const updateData = {
      status: status || 'online',
      last_heartbeat_at: new Date(),
      gps_lat: gps_lat || truck.gps_lat,
      gps_lng: gps_lng || truck.gps_lng,
      storage_mb: storage_mb || truck.storage_mb,
      battery_percent: battery_percent || truck.battery_percent
    };

    // Update telemetry if provided
    if (telemetry) {
      updateData.telemetry = {
        ...truck.telemetry,
        ...telemetry,
        last_updated: new Date()
      };
    }

    // Update player status if provided
    if (player_status) {
      updateData.player_status = {
        ...truck.player_status,
        ...player_status
      };
    }

    // Add new errors if provided
    if (errors && Array.isArray(errors)) {
      updateData.$push = {
        error_logs: {
          $each: errors.map(error => ({
            time: new Date(),
            level: error.level || 'info',
            message: error.message
          }))
        }
      };
    }

    await Truck.findByIdAndUpdate(truck._id, updateData);

    res.json({
      success: true,
      message: 'Status updated successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});

// Fetch playlist for current day
router.get('/playlist', authenticateHardware, async (req, res) => {
  try {
    const truck = req.truck;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get playlist for today
    let playlist = await Playlist.findOne({
      truck_id: truck._id,
      date: today
    });

    // If no playlist exists, generate one
    if (!playlist) {
      const campaigns = await Campaign.find({
        truck_id: truck._id,
        start_date: { $lte: today },
        end_date: { $gte: today },
        status: 'active'
      }).populate('video_id').sort({ play_order: 1 });

      playlist = {
        truck_id: truck._id,
        date: today,
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

      // Save the generated playlist
      const newPlaylist = new Playlist(playlist);
      await newPlaylist.save();
      playlist = newPlaylist;
    }

    // Update last sync time
    await Truck.findByIdAndUpdate(truck._id, {
      last_sync_at: new Date()
    });

    // Update playlist push status to synced
    await Playlist.findByIdAndUpdate(playlist._id, {
      push_status: 'synced',
      pushed_at: new Date()
    });

    res.json({
      success: true,
      timestamp: new Date(),
      version: playlist.version,
      playlist: playlist.playlist_data || []
    });
  } catch (error) {
    console.error('Playlist fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch playlist'
    });
  }
});

// Get truck telemetry (for backend monitoring)
router.get('/telemetry', authenticateHardware, async (req, res) => {
  try {
    const truck = req.truck;

    const telemetryData = {
      device: {
        id: truck.controller_id,
        uptime: truck.telemetry?.uptime || 0,
        cpu_usage: truck.telemetry?.cpu_usage || 0,
        memory_usage: truck.telemetry?.memory_usage || 0,
        disk_free: truck.telemetry?.disk_free || 0,
        network_rssi: truck.telemetry?.network_rssi || 0,
        temperature: truck.telemetry?.temperature || 0,
        last_updated: truck.telemetry?.last_updated
      },
      player: {
        status: truck.player_status?.status || 'stopped',
        current_item: truck.player_status?.current_item || null,
        position_sec: truck.player_status?.position_sec || 0,
        playlist_version: truck.player_status?.playlist_version || null
      },
      location: {
        lat: truck.gps_lat,
        lng: truck.gps_lng,
        last_heartbeat: truck.last_heartbeat_at
      },
      errors: truck.error_logs?.slice(-10) || [] // Last 10 errors
    };

    res.json({
      success: true,
      data: telemetryData
    });
  } catch (error) {
    console.error('Telemetry fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch telemetry'
    });
  }
});

// Download specific video (for truck hardware)
router.get('/video/:videoId', authenticateHardware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const truck = req.truck;

    // Verify video belongs to truck's active campaigns
    const campaign = await Campaign.findOne({
      _id: videoId,
      truck_id: truck._id,
      status: 'active',
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() }
    }).populate('video_id');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or not accessible'
      });
    }

    const video = campaign.video_id;
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video metadata not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: video._id,
        url: video.video_url,
        checksum: video.checksum,
        duration: video.duration_sec,
        filename: video.filename,
        file_size_mb: video.file_size_mb
      }
    });
  } catch (error) {
    console.error('Video fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video'
    });
  }
});

module.exports = router;
