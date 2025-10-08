const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const phoneValidation = body('phone')
  .matches(/^\+91[6-9]\d{9}$/)
  .withMessage('Please provide a valid Indian mobile number in E.164 format (+91XXXXXXXXXX)');

const otpValidation = body('otp')
  .isLength({ min: 6, max: 6 })
  .isNumeric()
  .withMessage('OTP must be a 6-digit number');

const campaignValidation = [
  body('campaign_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Campaign name is required and must be less than 100 characters'),
  
  body('company_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name is required and must be less than 100 characters'),
  
  body('truck_id')
    .isMongoId()
    .withMessage('Valid truck ID is required'),
  
  body('video_id')
    .isMongoId()
    .withMessage('Valid video ID is required'),
  
  body('package_type')
    .isIn(['half_month', 'full_month'])
    .withMessage('Package type must be either half_month or full_month'),
  
  body('start_date')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('play_order')
    .isInt({ min: 1, max: 7 })
    .withMessage('Play order must be between 1 and 7')
];

const truckValidation = [
  body('truck_number')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Truck number is required'),
  
  body('route_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Route name is required'),
  
  body('city_id')
    .isMongoId()
    .withMessage('Valid city ID is required')
];

const reorderValidation = [
  body('campaigns')
    .isArray({ min: 1, max: 7 })
    .withMessage('Campaigns must be an array with 1-7 items'),
  
  body('campaigns.*.campaign_id')
    .isMongoId()
    .withMessage('Each campaign must have a valid ID'),
  
  body('campaigns.*.play_order')
    .isInt({ min: 1, max: 7 })
    .withMessage('Each campaign must have a valid play order (1-7)')
];

module.exports = {
  validateRequest,
  phoneValidation,
  otpValidation,
  campaignValidation,
  truckValidation,
  reorderValidation
};
