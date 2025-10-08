const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { sendOTP, verifyOTP, generateToken } = require('../../middleware/auth');
const { phoneValidation, otpValidation, validateRequest } = require('../../middleware/validation');

// OTP-based login for admin users
router.post('/login', phoneValidation, validateRequest, async (req, res) => {
  try {
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(401).json({ 
        ok: false, 
        error: 'User not found. Please contact admin to create your account.' 
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Account not verified. Please complete OTP verification.' 
      });
    }

    // Send OTP for login
    const result = await sendOTP(phone);
    
    // Update user with verification details
    user.verificationSid = result.sid || null;
    user.lastOTPSentAt = new Date();
    await user.save();
    
    return res.json({ 
      ok: true, 
      message: 'OTP sent for login', 
      data: result 
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle rate limiting errors
    if (error.message.includes('Too many OTP requests')) {
      return res.status(429).json({
        ok: false,
        error: error.message
      });
    }
    
    // Handle Twilio errors
    if (error.message.includes('rate limit') || error.message.includes('Invalid phone')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    
    return res.status(500).json({ 
      ok: false, 
      error: 'Failed to send OTP' 
    });
  }
});

// Verify OTP for login
router.post('/login/verify', otpValidation, validateRequest, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ 
        ok: false, 
        error: 'User not found' 
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Account not verified' 
      });
    }

    // Verify OTP using Twilio Verify
    const verification = await verifyOTP(phone, otp);
    if (!verification.valid) {
      return res.status(401).json({ 
        ok: false, 
        error: 'Invalid code' 
      });
    }

    // Update user
    user.lastLoginAt = new Date();
    user.verificationSid = null; // Clear verification SID
    await user.save();

    const token = generateToken(user._id);

    return res.json({ 
      ok: true, 
      token, 
      user: { 
        id: user._id, 
        role: user.role, 
        phone: user.phone, 
        name: user.name 
      } 
    });
  } catch (error) {
    console.error('Login verify error:', error);
    
    // Handle Twilio errors
    if (error.message.includes('Invalid phone') || error.message.includes('authentication failed')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    
    return res.status(500).json({ 
      ok: false, 
      error: 'Failed to verify login' 
    });
  }
});

// Create admin user (for initial setup)
router.post('/create-admin', phoneValidation, validateRequest, async (req, res) => {
  try {
    const { phone, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        error: 'User already exists'
      });
    }

    // Create new admin user
    const user = new User({
      phone,
      name,
      role: 'admin',
      isVerified: false
    });

    await user.save();

    // Send OTP for account verification
    const result = await sendOTP(phone);
    
    // Update user with verification details
    user.verificationSid = result.sid || null;
    user.lastOTPSentAt = new Date();
    await user.save();

    return res.status(201).json({
      ok: true,
      message: 'Admin user created. OTP sent for verification.',
      data: result
    });
  } catch (error) {
    console.error('Create admin error:', error);
    
    // Handle rate limiting errors
    if (error.message.includes('Too many OTP requests')) {
      return res.status(429).json({
        ok: false,
        error: error.message
      });
    }
    
    // Handle Twilio errors
    if (error.message.includes('rate limit') || error.message.includes('Invalid phone')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      ok: false,
      error: 'Failed to create admin user'
    });
  }
});

// Verify admin user account after creation
router.post('/create-admin/verify', otpValidation, validateRequest, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        ok: false,
        error: 'Account already verified'
      });
    }

    // Verify OTP using Twilio Verify
    const verification = await verifyOTP(phone, otp);
    if (!verification.valid) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid code'
      });
    }

    // Update user as verified
    user.isVerified = true;
    user.lastLoginAt = new Date();
    user.verificationSid = null; // Clear verification SID
    await user.save();

    const token = generateToken(user._id);

    return res.json({
      ok: true,
      message: 'Account verified successfully',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify admin account error:', error);
    
    // Handle Twilio errors
    if (error.message.includes('Invalid phone') || error.message.includes('authentication failed')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      ok: false,
      error: 'Failed to verify account'
    });
  }
});

module.exports = router;
