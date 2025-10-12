const moment = require('moment');
const Campaign = require('../models/Campaign');

// Validate booking cycle rules
const validateBookingCycle = (startDate, endDate, packageType) => {
  const start = moment(startDate);
  const end = endDate ? moment(endDate) : null;
  const today = moment().startOf('day');



  // Check if start date is 1st or 16th
  const startDay = start.date();
  if (startDay !== 1 && startDay !== 16) {
    return {
      valid: false,
      error: 'Campaigns can only start on 1st or 16th of each month'
    };
  }

  // Prevent full_month packages from starting on 16th
  if (packageType === 'full_month' && startDay === 16) {
    return {
      valid: false,
      error: 'Full month campaigns can only start on 1st of month (1-30 days)'
    };
  }

  // Validate package type logic (only if endDate is provided)
  if (end) {
    if (packageType === 'half_month') {
      if (startDay === 1) {
        // Should end on 15th of same month
        const expectedEnd = start.clone().date(15);
        if (!end.isSame(expectedEnd, 'day')) {
          return {
            valid: false,
            error: 'Half month campaigns starting on 1st must end on 15th of the same month'
          };
        }
      } else if (startDay === 16) {
        // Should end on 30th of same month (treating all months as 30 days)
        const expectedEnd = start.clone().date(30);
        if (!end.isSame(expectedEnd, 'day')) {
          return {
            valid: false,
            error: 'Half month campaigns starting on 16th must end on 30th of the same month'
          };
        }
      }
    } else if (packageType === 'full_month') {
      if (startDay !== 1) {
        return {
          valid: false,
          error: 'Full month campaigns must start on 1st of month'
        };
      }
      // Should end on 30th of same month (treating all months as 30 days)
      const expectedEnd = start.clone().date(30);
      if (!end.isSame(expectedEnd, 'day')) {
        return {
          valid: false,
          error: 'Full month campaigns must end on 30th of the same month'
        };
      }
    }
  } else {
    // When endDate is not provided, just validate the start date rules
    if (packageType === 'full_month' && startDay !== 1) {
      return {
        valid: false,
        error: 'Full month campaigns must start on 1st of month'
      };
    }
  }

  return { valid: true };
};

// Check for overbooking in affected cycles
const checkOverbooking = async (truckId, startDate, endDate, packageType, excludeCampaignId = null) => {
  const start = moment(startDate);
  const end = moment(endDate);

  // Determine affected cycles
  const affectedCycles = [];
  
  if (packageType === 'half_month') {
    const startDay = start.date();
    if (startDay === 1) {
      // Cycle 1: 1st to 15th
      affectedCycles.push({
        start: start.clone(),
        end: start.clone().date(15),
        cycleNumber: 1
      });
    } else if (startDay === 16) {
      // Cycle 2: 16th to 30th (treating all months as 30 days)
      affectedCycles.push({
        start: start.clone(),
        end: start.clone().date(30),
        cycleNumber: 2
      });
    }
  } else if (packageType === 'full_month') {
    // Full month affects both cycles
    affectedCycles.push(
      {
        start: start.clone(),
        end: start.clone().date(15),
        cycleNumber: 1
      },
      {
        start: start.clone().date(16),
        end: start.clone().date(30),
        cycleNumber: 2
      }
    );
  }

  // Check each affected cycle for overbooking
  for (const cycle of affectedCycles) {
    const query = {
      truck_id: truckId,
      status: 'active',
      start_date: { $lte: cycle.end.toDate() },
      end_date: { $gte: cycle.start.toDate() }
    };

    // Exclude current campaign if updating
    if (excludeCampaignId) {
      query._id = { $ne: excludeCampaignId };
    }

    const activeCampaigns = await Campaign.countDocuments(query);

    if (activeCampaigns >= 7) {
      return {
        canBook: false,
        error: `Cycle ${cycle.start.format('MMM D')} - ${cycle.end.format('MMM D')} is fully booked (7/7 slots)`,
        cycle: cycle,
        nextAvailable: await findNextAvailableCycle(truckId, cycle.end)
      };
    }
  }

  return { canBook: true };
};

// Find next available cycle
const findNextAvailableCycle = async (truckId, afterDate) => {
  const start = moment(afterDate).add(1, 'day');
  
  // Look ahead for next 6 months
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const checkDate = start.clone().add(monthOffset, 'month');
    
    // Check both cycles in this month
    const cycles = [
      {
        start: checkDate.clone().date(1),
        end: checkDate.clone().date(15),
        cycleNumber: 1
      },
      {
        start: checkDate.clone().date(16),
        end: checkDate.clone().endOf('month'),
        cycleNumber: 2
      }
    ];

    for (const cycle of cycles) {
      if (cycle.start.isBefore(moment())) continue; // Skip past cycles

      const activeCampaigns = await Campaign.countDocuments({
        truck_id: truckId,
        status: 'active',
        start_date: { $lte: cycle.end.toDate() },
        end_date: { $gte: cycle.start.toDate() }
      });

      if (activeCampaigns < 7) {
        return {
          start: cycle.start.toDate(),
          end: cycle.end.toDate(),
          cycleNumber: cycle.cycleNumber,
          availableSlots: 7 - activeCampaigns
        };
      }
    }
  }

  return null; // No available cycles found
};

// Get available booking cycles for dropdown
const getAvailableCycles = async (truckId, monthsAhead = 6) => {
  const today = moment().startOf('day');
  const cycles = [];

  for (let monthOffset = 0; monthOffset < monthsAhead; monthOffset++) {
    const checkDate = today.clone().add(monthOffset, 'month');
    
    // Check both cycles in this month
    const cycle1 = {
      start: checkDate.clone().date(1),
      end: checkDate.clone().date(15),
      cycleNumber: 1,
      label: `Half Month (${checkDate.format('MMM')} 1-15, ${checkDate.format('YYYY')})`
    };

    const cycle2 = {
      start: checkDate.clone().date(16),
      end: checkDate.clone().date(30),
      cycleNumber: 2,
      label: `Half Month (${checkDate.format('MMM')} 16-30, ${checkDate.format('YYYY')})`
    };

    const fullMonth = {
      start: checkDate.clone().date(1),
      end: checkDate.clone().date(30),
      cycleNumber: 'both',
      label: `Full Month (${checkDate.format('MMM')} 1-30, ${checkDate.format('YYYY')})`
    };

    // Check availability for each cycle
    for (const cycle of [cycle1, cycle2, fullMonth]) {
      if (cycle.start.isBefore(today)) continue; // Skip past cycles

      let activeCampaigns = 0;
      
      if (cycle.cycleNumber === 'both') {
        // Full month - check both cycles
        const cycle1Campaigns = await Campaign.countDocuments({
          truck_id: truckId,
          status: 'active',
          start_date: { $lte: cycle1.end.toDate() },
          end_date: { $gte: cycle1.start.toDate() }
        });

        const cycle2Campaigns = await Campaign.countDocuments({
          truck_id: truckId,
          status: 'active',
          start_date: { $lte: cycle2.end.toDate() },
          end_date: { $gte: cycle2.start.toDate() }
        });

        activeCampaigns = Math.max(cycle1Campaigns, cycle2Campaigns);
      } else {
        // Single cycle
        activeCampaigns = await Campaign.countDocuments({
          truck_id: truckId,
          status: 'active',
          start_date: { $lte: cycle.end.toDate() },
          end_date: { $gte: cycle.start.toDate() }
        });
      }

      cycles.push({
        ...cycle,
        availableSlots: 7 - activeCampaigns,
        isFullyBooked: activeCampaigns >= 7,
        packageType: cycle.cycleNumber === 'both' ? 'full_month' : 'half_month'
      });
    }
  }

  return cycles.filter(cycle => cycle.availableSlots > 0);
};

// Calculate campaign end date based on start date and package type
const calculateEndDate = (startDate, packageType) => {
  // Parse start date consistently using native Date
  const start = new Date(startDate);
  const startDay = start.getDate();
  
  if (packageType === 'half_month') {
    if (startDay === 1) {
      // Return 15th of same month
      const expectedEnd = new Date(start);
      expectedEnd.setDate(15);
      return expectedEnd;
    } else if (startDay === 16) {
      // Return 30th of same month (treating all months as 30 days)
      const expectedEnd = new Date(start);
      expectedEnd.setDate(30);
      return expectedEnd;
    }
  } else if (packageType === 'full_month') {
    // Return 30th of same month (treating all months as 30 days)
    const expectedEnd = new Date(start);
    expectedEnd.setDate(30);
    return expectedEnd;
  }
  
  throw new Error('Invalid package type or start date');
};

module.exports = {
  validateBookingCycle,
  checkOverbooking,
  findNextAvailableCycle,
  getAvailableCycles,
  calculateEndDate
};
