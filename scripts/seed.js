const City = require('../models/City');
const Truck = require('../models/Truck');
const User = require('../models/User');

// Seed initial data
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Create cities
    const cities = [
      { name: 'Mumbai', enabled: true, coordinates: { lat: 19.0760, lng: 72.8777 }, timezone: 'Asia/Kolkata' },
      { name: 'Delhi', enabled: true, coordinates: { lat: 28.7041, lng: 77.1025 }, timezone: 'Asia/Kolkata' },
      { name: 'Bangalore', enabled: true, coordinates: { lat: 12.9716, lng: 77.5946 }, timezone: 'Asia/Kolkata' },
      { name: 'Chennai', enabled: true, coordinates: { lat: 13.0827, lng: 80.2707 }, timezone: 'Asia/Kolkata' },
      { name: 'Kolkata', enabled: true, coordinates: { lat: 22.5726, lng: 88.3639 }, timezone: 'Asia/Kolkata' }
    ];

    const createdCities = [];
    for (const cityData of cities) {
      const existingCity = await City.findOne({ name: cityData.name });
      if (!existingCity) {
        const city = new City(cityData);
        await city.save();
        createdCities.push(city);
        console.log(`Created city: ${city.name}`);
      } else {
        createdCities.push(existingCity);
        console.log(`City already exists: ${existingCity.name}`);
      }
    }

    // Create trucks for each city
    const trucks = [
      { city: 'Mumbai', truck_number: 'MH01-001', route_name: 'Marine Drive Route', controller_id: 'TRUCK_MH01_001' },
      { city: 'Mumbai', truck_number: 'MH01-002', route_name: 'Bandra Route', controller_id: 'TRUCK_MH01_002' },
      { city: 'Delhi', truck_number: 'DL01-001', route_name: 'Connaught Place Route', controller_id: 'TRUCK_DL01_001' },
      { city: 'Delhi', truck_number: 'DL01-002', route_name: 'Karol Bagh Route', controller_id: 'TRUCK_DL01_002' },
      { city: 'Bangalore', truck_number: 'KA01-001', route_name: 'MG Road Route', controller_id: 'TRUCK_KA01_001' },
      { city: 'Bangalore', truck_number: 'KA01-002', route_name: 'Koramangala Route', controller_id: 'TRUCK_KA01_002' },
      { city: 'Chennai', truck_number: 'TN01-001', route_name: 'T. Nagar Route', controller_id: 'TRUCK_TN01_001' },
      { city: 'Chennai', truck_number: 'TN01-002', route_name: 'Anna Salai Route', controller_id: 'TRUCK_TN01_002' },
      { city: 'Kolkata', truck_number: 'WB01-001', route_name: 'Park Street Route', controller_id: 'TRUCK_WB01_001' },
      { city: 'Kolkata', truck_number: 'WB01-002', route_name: 'Salt Lake Route', controller_id: 'TRUCK_WB01_002' }
    ];

    for (const truckData of trucks) {
      const city = createdCities.find(c => c.name === truckData.city);
      if (city) {
        const existingTruck = await Truck.findOne({ controller_id: truckData.controller_id });
        if (!existingTruck) {
          const truck = new Truck({
            city_id: city._id,
            truck_number: truckData.truck_number,
            route_name: truckData.route_name,
            controller_id: truckData.controller_id,
            status: 'offline',
            gps_lat: city.coordinates.lat + (Math.random() - 0.5) * 0.01,
            gps_lng: city.coordinates.lng + (Math.random() - 0.5) * 0.01,
            storage_mb: Math.floor(Math.random() * 1000) + 500,
            battery_percent: Math.floor(Math.random() * 100)
          });
          await truck.save();
          console.log(`Created truck: ${truck.truck_number} in ${city.name}`);
        } else {
          console.log(`Truck already exists: ${existingTruck.truck_number}`);
        }
      }
    }

    // Admin users will be created manually through the API when needed

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Database seeding error:', error);
  }
};

module.exports = { seedDatabase };
