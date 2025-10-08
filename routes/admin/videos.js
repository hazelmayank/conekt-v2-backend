const express = require('express');
const router = express.Router();
const multer = require('multer');
const Video = require('../../models/Video');
const { authenticateToken } = require('../../middleware/auth');
const { generateUploadSignature, calculateChecksum, createUploadStream } = require('../../services/cloudinary');
const auditLog = require('../../middleware/audit');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is a video
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Get presigned upload URL
router.post('/uploads/presign', 
  authenticateToken, 
  auditLog('upload_video', 'video'),
  async (req, res) => {
    try {
      const { filename, folder } = req.body;

      if (!filename) {
        return res.status(400).json({
          success: false,
          message: 'Filename is required'
        });
      }

      const uploadSignature = generateUploadSignature(folder || 'conekt-videos');

      res.json({
        success: true,
        data: {
          ...uploadSignature,
          filename: filename
        }
      });
    } catch (error) {
      console.error('Generate upload signature error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate upload signature'
      });
    }
  }
);

// Direct video upload endpoint
router.post('/video-assets', 
  authenticateToken, 
  upload.single('video'),
  auditLog('upload_video', 'video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: 'No video file provided' 
        });
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = createUploadStream(
          {
            resource_type: 'video',
            folder: 'conekt/videos',
            public_id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transformation: [
              { width: 1920, height: 1080, crop: "scale" } // force 1080p
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(req.file.buffer);
      });

      // Calculate checksum
      const checksum = calculateChecksum(result.secure_url);

      // Create video record
      const video = new Video({
        video_url: result.secure_url,
        filename: req.file.originalname,
        duration_sec: Math.round(result.duration),
        file_size_mb: Math.round(result.bytes / (1024 * 1024) * 100) / 100, // Convert to MB with 2 decimal places
        cloudinary_public_id: result.public_id,
        checksum: checksum,
        resolution: {
          width: result.width,
          height: result.height
        },
        format: result.format,
        bitrate: result.bit_rate
      });

      await video.save();

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          id: video._id,
          url: video.video_url,
          filename: video.filename,
          durationSec: video.duration_sec,
          fileSize: video.file_size_mb,
          resolution: video.resolution,
          format: video.format
        }
      });
    } catch (error) {
      console.error('Upload video error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to upload video' 
      });
    }
  }
);

// Save video metadata after upload
router.post('/videos', 
  authenticateToken, 
  auditLog('upload_video', 'video'),
  async (req, res) => {
    try {
      const { 
        video_url, 
        filename, 
        duration_sec, 
        file_size_mb, 
        cloudinary_public_id,
        resolution,
        format,
        bitrate
      } = req.body;

      // Validate required fields
      if (!video_url || !filename || !duration_sec || !file_size_mb) {
        return res.status(400).json({
          success: false,
          message: 'Missing required video metadata'
        });
      }

      // Calculate checksum
      const checksum = calculateChecksum(video_url);

      // Create video record
      const video = new Video({
        video_url,
        filename,
        duration_sec,
        file_size_mb,
        cloudinary_public_id,
        checksum,
        resolution,
        format,
        bitrate
      });

      await video.save();

      res.status(201).json({
        success: true,
        message: 'Video metadata saved successfully',
        data: video
      });
    } catch (error) {
      console.error('Save video metadata error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save video metadata'
      });
    }
  }
);

// Get all videos
router.get('/videos', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { filename: { $regex: search, $options: 'i' } }
      ];
    }

    const videos = await Video.find(query)
      .select('filename video_url duration_sec file_size_mb format resolution')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos'
    });
  }
});

// Get video details
router.get('/videos/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Get video details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video details'
    });
  }
});

// Delete video
router.delete('/videos/:videoId', 
  authenticateToken, 
  auditLog('delete_video', 'video'),
  async (req, res) => {
    try {
      const { videoId } = req.params;

      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check if video is used in any active campaigns
      const Campaign = require('../../models/Campaign');
      const activeCampaigns = await Campaign.countDocuments({
        video_id: videoId,
        status: 'active'
      });

      if (activeCampaigns > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete video that is used in active campaigns'
        });
      }

      // Delete from Cloudinary if public_id exists
      if (video.cloudinary_public_id) {
        const { deleteVideo } = require('../../services/cloudinary');
        await deleteVideo(video.cloudinary_public_id);
      }

      // Delete from database
      await Video.findByIdAndDelete(videoId);

      res.json({
        success: true,
        message: 'Video deleted successfully'
      });
    } catch (error) {
      console.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete video'
      });
    }
  }
);

module.exports = router;
