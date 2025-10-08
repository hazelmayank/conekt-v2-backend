const express = require('express');
const router = express.Router();
const City = require('../../models/City');
const Truck = require('../../models/Truck');
const { authenticateToken } = require('../../middleware/auth');
const { truckValidation, validateRequest } = require('../../middleware/validation');
const auditLog = require('../../middleware/audit');

// Get all cities
router.get('/cities', authenticateToken, async (req, res) => {
  try {
    const cities = await City.find({ enabled: true })
      .select('name coordinates timezone')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities'
    });
  }
});

// Create new truck
router.post('/trucks', 
  authenticateToken, 
  truckValidation, 
  validateRequest,
  auditLog('create_truck', 'truck'),
  async (req, res) => {
    try {
      const {
        city_id,
        truck_number,
        route,
        gps_lat,
        gps_lng
      } = req.body;

      // Auto-generate controller_id from truck_number
      const controller_id = `TRUCK_${truck_number.replace(/[^A-Z0-9]/g, '_')}`;

      // Check if truck number already exists
      const existingTruckNumber = await Truck.findOne({ truck_number });
      if (existingTruckNumber) {
        return res.status(400).json({
          success: false,
          message: 'Truck number already exists'
        });
      }

      // Check if controller ID already exists
      const existingControllerId = await Truck.findOne({ controller_id });
      if (existingControllerId) {
        return res.status(400).json({
          success: false,
          message: 'Controller ID already exists'
        });
      }

      // Verify city exists
      const city = await City.findById(city_id);
      if (!city) {
        return res.status(404).json({
          success: false,
          message: 'City not found'
        });
      }

      // Create truck
      const truck = new Truck({
        city_id,
        truck_number,
        route: {
          route_name: route.route_name,
          polyline: route.polyline || [],
          polygon: route.polygon || []
        },
        controller_id,
        status: 'offline',
        gps_lat: gps_lat || null,
        gps_lng: gps_lng || null,
        storage_mb: 0,
        battery_percent: 0
      });

      await truck.save();

      // Populate city details
      await truck.populate('city_id', 'name coordinates timezone');

      res.status(201).json({
        success: true,
        message: 'Truck created successfully',
        data: truck
      });
    } catch (error) {
      console.error('Create truck error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Truck with this number or controller ID already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create truck',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Get trucks in a city
router.get('/cities/:cityId/trucks', authenticateToken, async (req, res) => {
  try {
    const { cityId } = req.params;
    
    const trucks = await Truck.find({ city_id: cityId })
      .populate('city_id', 'name')
      .select('truck_number route controller_id status last_heartbeat_at gps_lat gps_lng storage_mb battery_percent')
      .sort({ truck_number: 1 });

    // Add online/offline status
    const trucksWithStatus = trucks.map(truck => ({
      ...truck.toObject(),
      isOnline: truck.isOnline
    }));

    res.json({
      success: true,
      data: trucksWithStatus
    });
  } catch (error) {
    console.error('Get trucks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trucks'
    });
  }
});

// Get truck details
router.get('/trucks/:truckId', authenticateToken, async (req, res) => {
  try {
    const { truckId } = req.params;
    
    const truck = await Truck.findById(truckId)
      .populate('city_id', 'name coordinates timezone');

    if (!truck) {
      return res.status(404).json({
        success: false,
        message: 'Truck not found'
      });
    }

    const truckData = {
      ...truck.toObject(),
      isOnline: truck.isOnline
    };

    res.json({
      success: true,
      data: truckData
    });
  } catch (error) {
    console.error('Get truck details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch truck details'
    });
  }
});

// Get truck playlist for specific date
router.get('/trucks/:truckId/playlist', authenticateToken, async (req, res) => {
  try {
    const { truckId } = req.params;
    const { date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const Playlist = require('../../models/Playlist');
    const Campaign = require('../../models/Campaign');

    // Get playlist for the date
    let playlist = await Playlist.findOne({ 
      truck_id: truckId, 
      date: targetDate 
    }).populate('campaign_ids');

    // If no playlist exists, generate one
    if (!playlist) {
      const campaigns = await Campaign.find({
        truck_id: truckId,
        start_date: { $lte: targetDate },
        end_date: { $gte: targetDate },
        status: 'active'
      }).populate('video_id').sort({ play_order: 1 });

      playlist = {
        truck_id: truckId,
        date: targetDate,
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
    }

    res.json({
      success: true,
      data: playlist
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch playlist'
    });
  }
});

// Get calendar view for truck
router.get('/trucks/:truckId/calendar', authenticateToken, async (req, res) => {
  try {
    const { truckId } = req.params;
    const { start_date, end_date } = req.query;
    
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days ahead

    const Campaign = require('../../models/Campaign');
    const { getAvailableCycles } = require('../../services/bookingValidation');

    // Get campaigns in date range
    const campaigns = await Campaign.find({
      truck_id: truckId,
      $or: [
        { start_date: { $gte: startDate, $lte: endDate } },
        { end_date: { $gte: startDate, $lte: endDate } },
        { start_date: { $lte: startDate }, end_date: { $gte: endDate } }
      ]
    }).populate('video_id').sort({ start_date: 1, play_order: 1 });

    // Get available cycles
    const availableCycles = await getAvailableCycles(truckId, 6);

    // Group campaigns by date
    const calendarData = {};
    campaigns.forEach(campaign => {
      const start = new Date(campaign.start_date);
      const end = new Date(campaign.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        if (!calendarData[dateKey]) {
          calendarData[dateKey] = [];
        }
        calendarData[dateKey].push(campaign);
      }
    });

    res.json({
      success: true,
      data: {
        campaigns: calendarData,
        availableCycles,
        dateRange: {
          start: startDate,
          end: endDate
        }
      }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar data'
    });
  }
});

module.exports = router;
