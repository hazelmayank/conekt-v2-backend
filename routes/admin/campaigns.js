const express = require('express');
const router = express.Router();
const Campaign = require('../../models/Campaign');
const Video = require('../../models/Video');
const Playlist = require('../../models/Playlist');
const { authenticateToken } = require('../../middleware/auth');
const { campaignValidation, reorderValidation, validateRequest } = require('../../middleware/validation');
const auditLog = require('../../middleware/audit');
const { validateBookingCycle, checkOverbooking, calculateEndDate } = require('../../services/bookingValidation');

// Create new campaign
router.post('/campaigns', 
  authenticateToken, 
  campaignValidation, 
  validateRequest,
  auditLog('create_campaign', 'campaign'),
  async (req, res) => {
    try {
      const { 
        campaign_name, 
        company_name, 
        truck_id, 
        video_id, 
        package_type, 
        start_date, 
        play_order 
      } = req.body;
      
      // Validate booking cycle
      const cycleValidation = validateBookingCycle(start_date, null, package_type);
      if (!cycleValidation.valid) {
        return res.status(400).json({
          success: false,
          message: cycleValidation.error
        });
      }

      // Calculate end date
      const end_date = calculateEndDate(start_date, package_type);

      // Validate truck exists
      const Truck = require('../../models/Truck');
      const truck = await Truck.findById(truck_id);
      if (!truck) {
        return res.status(404).json({
          success: false,
          message: 'Truck not found'
        });
      }

      // Check for overbooking
      const overbookingCheck = await checkOverbooking(truck_id, start_date, end_date, package_type);
      if (!overbookingCheck.canBook) {
        return res.status(400).json({
          success: false,
          message: overbookingCheck.error,
          nextAvailable: overbookingCheck.nextAvailable
        });
      }

      // Get video details
      const video = await Video.findById(video_id);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Create campaign
      const campaign = new Campaign({
        campaign_name,
        company_name,
        truck_id,
        video_id,
        video_url: video.video_url,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        package_type,
        play_order,
        created_by: req.user._id
      });

      await campaign.save();

      // Populate video details
      await campaign.populate('video_id');

      res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: campaign
      });
    } catch (error) {
      console.error('Create campaign error:', error);
      
      // Handle specific error types
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
          message: 'Campaign with this configuration already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create campaign',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Remove campaign
router.delete('/campaigns/:campaignId', 
  authenticateToken, 
  auditLog('delete_campaign', 'campaign'),
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }

      // Check if campaign is active
      if (campaign.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Only active campaigns can be removed'
        });
      }

      // Soft delete by changing status
      campaign.status = 'cancelled';
      await campaign.save();

      res.json({
        success: true,
        message: 'Campaign removed successfully'
      });
    } catch (error) {
      console.error('Remove campaign error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove campaign'
      });
    }
  }
);

// Reorder campaigns
router.post('/trucks/:truckId/reorder', 
  authenticateToken, 
  reorderValidation, 
  validateRequest,
  auditLog('reorder_campaigns', 'campaign'),
  async (req, res) => {
    try {
      const { truckId } = req.params;
      const { campaigns } = req.body;

      // Validate all campaigns belong to the truck
      const campaignIds = campaigns.map(c => c.campaign_id);
      const existingCampaigns = await Campaign.find({
        _id: { $in: campaignIds },
        truck_id: truckId,
        status: 'active'
      });

      if (existingCampaigns.length !== campaigns.length) {
        return res.status(400).json({
          success: false,
          message: 'Some campaigns not found or not active'
        });
      }

      // Update play orders
      const updatePromises = campaigns.map(campaign => 
        Campaign.findByIdAndUpdate(campaign.campaign_id, {
          play_order: campaign.play_order
        })
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'Campaigns reordered successfully'
      });
    } catch (error) {
      console.error('Reorder campaigns error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder campaigns'
      });
    }
  }
);

// Push playlist to truck
router.post('/trucks/:truckId/push', 
  authenticateToken, 
  auditLog('push_playlist', 'playlist'),
  async (req, res) => {
    try {
      const { truckId } = req.params;
      const { date } = req.body;
      
      const targetDate = date ? new Date(date + 'T00:00:00.000Z') : new Date();
      // Ensure we're working with UTC dates for consistent comparison

      const Campaign = require('../../models/Campaign');

      // Get active campaigns for the date
      const campaigns = await Campaign.find({
        truck_id: truckId,
        start_date: { $lte: targetDate },
        end_date: { $gte: targetDate },
        status: 'active'
      }).populate('video_id').sort({ play_order: 1 });

      // Create or update playlist
      const playlistData = {
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
        push_status: 'pending',
        pushed_at: new Date()
      };

      const playlist = await Playlist.findOneAndUpdate(
        { truck_id: truckId, date: targetDate },
        playlistData,
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: 'Playlist pushed successfully',
        data: {
          playlistId: playlist._id,
          version: playlist.version,
          campaignCount: campaigns.length,
          pushStatus: playlist.push_status
        }
      });
    } catch (error) {
      console.error('Push playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to push playlist'
      });
    }
  }
);

module.exports = router;
