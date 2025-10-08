const express = require('express');
const router = express.Router();
const Truck = require('../../models/Truck');
const Campaign = require('../../models/Campaign');
const Playlist = require('../../models/Playlist');
const City = require('../../models/City');
const { authenticateToken } = require('../../middleware/auth');

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get overall stats
    const totalTrucks = await Truck.countDocuments();
    const onlineTrucks = await Truck.countDocuments({
      last_heartbeat_at: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });
    const totalCities = await City.countDocuments({ enabled: true });
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
    const expiredCampaigns = await Campaign.countDocuments({ status: 'expired' });

    // Get trucks by status
    const trucksByStatus = await Truck.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get campaigns by package type
    const campaignsByPackage = await Campaign.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$package_type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 7 days)
    const recentCampaigns = await Campaign.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .populate('truck_id', 'truck_number route_name')
      .populate('video_id', 'filename')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get trucks with issues (offline for more than 1 hour)
    const trucksWithIssues = await Truck.find({
      last_heartbeat_at: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
    })
      .populate('city_id', 'name')
      .select('truck_number route_name city_id last_heartbeat_at status')
      .sort({ last_heartbeat_at: 1 })
      .limit(10);

    // Get upcoming campaign expirations (next 7 days)
    const upcomingExpirations = await Campaign.find({
      end_date: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      status: 'active'
    })
      .populate('truck_id', 'truck_number route_name')
      .sort({ end_date: 1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalTrucks,
          onlineTrucks,
          offlineTrucks: totalTrucks - onlineTrucks,
          totalCities,
          activeCampaigns,
          expiredCampaigns
        },
        trucksByStatus: trucksByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        campaignsByPackage: campaignsByPackage.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentActivity: {
          campaigns: recentCampaigns
        },
        alerts: {
          trucksWithIssues,
          upcomingExpirations
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get system health
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Database health
    const dbStats = {
      trucks: await Truck.countDocuments(),
      campaigns: await Campaign.countDocuments(),
      playlists: await Playlist.countDocuments(),
      cities: await City.countDocuments()
    };

    // Truck health
    const truckHealth = {
      online: await Truck.countDocuments({
        last_heartbeat_at: { $gte: new Date(now.getTime() - 10 * 60 * 1000) }
      }),
      offline: await Truck.countDocuments({
        last_heartbeat_at: { $lt: new Date(now.getTime() - 10 * 60 * 1000) }
      }),
      noHeartbeat: await Truck.countDocuments({
        last_heartbeat_at: { $lt: oneHourAgo }
      })
    };

    // Campaign health
    const campaignHealth = {
      active: await Campaign.countDocuments({ status: 'active' }),
      expired: await Campaign.countDocuments({ status: 'expired' }),
      cancelled: await Campaign.countDocuments({ status: 'cancelled' })
    };

    // Playlist health
    const playlistHealth = {
      pending: await Playlist.countDocuments({ push_status: 'pending' }),
      synced: await Playlist.countDocuments({ push_status: 'synced' }),
      failed: await Playlist.countDocuments({ push_status: 'failed' })
    };

    res.json({
      success: true,
      data: {
        timestamp: now,
        database: dbStats,
        trucks: truckHealth,
        campaigns: campaignHealth,
        playlists: playlistHealth,
        status: truckHealth.noHeartbeat > 0 ? 'warning' : 'healthy'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform health check'
    });
  }
});

module.exports = router;
