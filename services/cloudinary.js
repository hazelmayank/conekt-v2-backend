const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Generate upload signature for secure uploads
const generateUploadSignature = (folder = 'conekt-videos') => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const public_id = `video_${timestamp}_${crypto.randomBytes(8).toString('hex')}`;
  
  const params = {
    folder: folder,
    resource_type: 'video',
    public_id: public_id,
    timestamp: timestamp,
    eager: [
      { width: 1920, height: 1080, crop: 'scale', quality: 'auto' },
      { width: 1280, height: 720, crop: 'scale', quality: 'auto' }
    ],
    eager_async: true
  };

  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  
  return {
    signature,
    timestamp,
    public_id,
    folder,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
  };
};

// Upload video to Cloudinary (for file paths)
const uploadVideo = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'conekt-videos',
      eager: [
        { width: 1920, height: 1080, crop: 'scale', quality: 'auto' },
        { width: 1280, height: 720, crop: 'scale', quality: 'auto' }
      ],
      eager_async: true,
      ...options
    });

    return {
      success: true,
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        duration: result.duration,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      }
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create upload stream for direct buffer uploads
const createUploadStream = (options = {}, callback) => {
  return cloudinary.uploader.upload_stream(options, callback);
};

// Delete video from Cloudinary
const deleteVideo = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video'
    });
    
    return {
      success: result.result === 'ok',
      data: result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate video URL with transformations
const getVideoUrl = (publicId, options = {}) => {
  const defaultOptions = {
    resource_type: 'video',
    quality: 'auto',
    fetch_format: 'auto'
  };

  return cloudinary.url(publicId, {
    ...defaultOptions,
    ...options
  });
};


// Calculate file checksum for integrity verification
const calculateChecksum = (url) => {
  // In a real implementation, you might want to download the file
  // and calculate its checksum. For now, we'll use the URL as a simple hash
  return crypto.createHash('md5').update(url).digest('hex');
};

module.exports = {
  generateUploadSignature,
  uploadVideo,
  createUploadStream,
  deleteVideo,
  getVideoUrl,
  calculateChecksum
};
