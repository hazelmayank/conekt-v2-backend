const twilio = require('twilio');

// Development mode detection
const DEV_MODE = !process.env.TWILIO_ACCOUNT_SID || 
                 !process.env.TWILIO_AUTH_TOKEN || 
                 !process.env.TWILIO_VERIFY_SID || 
                 process.env.FORCE_DEV_MODE === 'true';

let client = null;
if (!DEV_MODE) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Rate limiting store (in-memory, upgrade to Redis for production)
const rateLimitStore = new Map();

// Rate limiting function
const checkRateLimit = (phone) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 3; // Max 3 requests per minute
  
  if (!rateLimitStore.has(phone)) {
    rateLimitStore.set(phone, []);
  }
  
  const requests = rateLimitStore.get(phone);
  
  // Remove requests outside the window
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  
  if (validRequests.length >= maxRequests) {
    const oldestRequest = Math.min(...validRequests);
    const waitTime = Math.ceil((oldestRequest + windowMs - now) / 1000);
    throw new Error(`Too many OTP requests. Please wait ${waitTime} seconds before trying again.`);
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitStore.set(phone, validRequests);
};

// Send OTP using Twilio Verify API
const sendOTP = async (phone) => {
  try {
    // Check rate limit
    checkRateLimit(phone);
    
    // Development mode
    if (DEV_MODE) {
      console.log(`[DEV] OTP for ${phone}: 000000`);
      return {
        dev: true,
        message: 'DEV mode: use code 000000',
        otp: '000000'
      };
    }
    
    // Production mode - use Twilio Verify API
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications
      .create({
        to: phone,
        channel: 'sms'
      });
    
    return {
      sid: verification.sid,
      status: verification.status
    };
    
  } catch (error) {
    console.error('Twilio sendOTP error:', error);
    
    // Handle Twilio API errors
    if (error.code) {
      switch (error.code) {
        case 20429:
          throw new Error('OTP rate limit exceeded. Please wait a few minutes before trying again.');
        case 21211:
          throw new Error('Invalid phone number format');
        case 20003:
          throw new Error('Twilio authentication failed');
        case 20404:
          throw new Error('Twilio service not available');
        default:
          throw new Error('Failed to send OTP. Please try again later.');
      }
    }
    
    // Handle application-level errors (rate limiting)
    throw error;
  }
};

// Verify OTP using Twilio Verify API
const verifyOTP = async (phone, code) => {
  try {
    // Development mode
    if (DEV_MODE) {
      return { valid: code === '000000' };
    }
    
    // Production mode - use Twilio Verify API
    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks
      .create({
        to: phone,
        code: code
      });
    
    return { valid: check.status === 'approved' };
    
  } catch (error) {
    console.error('Twilio verifyOTP error:', error);
    
    // Handle Twilio API errors
    if (error.code) {
      switch (error.code) {
        case 20404:
          return { valid: false }; // Invalid code
        case 21211:
          throw new Error('Invalid phone number format');
        case 20003:
          throw new Error('Twilio authentication failed');
        default:
          throw new Error('Failed to verify OTP. Please try again later.');
      }
    }
    
    return { valid: false };
  }
};

// Clear rate limit for a phone number (utility function)
const clearRateLimit = (phone) => {
  rateLimitStore.delete(phone);
};

// Get rate limit status for a phone number (utility function)
const getRateLimitStatus = (phone) => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 3;
  
  if (!rateLimitStore.has(phone)) {
    return { remaining: maxRequests, resetTime: null };
  }
  
  const requests = rateLimitStore.get(phone);
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  const remaining = Math.max(0, maxRequests - validRequests.length);
  
  let resetTime = null;
  if (validRequests.length >= maxRequests) {
    const oldestRequest = Math.min(...validRequests);
    resetTime = new Date(oldestRequest + windowMs);
  }
  
  return { remaining, resetTime };
};

module.exports = {
  sendOTP,
  verifyOTP,
  clearRateLimit,
  getRateLimitStatus,
  DEV_MODE
};
