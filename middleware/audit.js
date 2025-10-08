const AuditLog = require('../models/AuditLog');

// Audit logging middleware
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log the action after response is sent
      if (res.statusCode < 400) { // Only log successful operations
        const auditData = {
          user_id: req.user?._id,
          action: action,
          entity_type: entityType,
          entity_id: req.params.id || req.body.id || req.params.campaignId || req.params.truckId,
          details: {
            method: req.method,
            url: req.originalUrl,
            body: req.method !== 'GET' ? req.body : undefined,
            params: req.params,
            query: req.query
          },
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('User-Agent')
        };

        // Don't await to avoid blocking response
        AuditLog.create(auditData).catch(err => {
          console.error('Audit log error:', err);
        });
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = auditLog;
