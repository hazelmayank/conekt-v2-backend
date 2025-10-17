const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTP: twilioSendOTP, verifyOTP: twilioVerifyOTP } = require('../services/twilio');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d' // 7 days as per documentation
  });
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-otp');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Send OTP using Twilio service
const sendOTP = async (phone) => {
  try {
    return await twilioSendOTP(phone);
  } catch (error) {
    console.error('Send OTP error:', error);
    throw error;
  }
};

// Verify OTP using Twilio service
const verifyOTP = async (phone, code) => {
  try {
    return await twilioVerifyOTP(phone, code);
  } catch (error) {
    console.error('Verify OTP error:', error);
    throw error;
  }
};

module.exports = {
  generateToken,
  authenticateToken,
  sendOTP,
  verifyOTP
};
