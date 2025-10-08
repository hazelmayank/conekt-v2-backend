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

    // Create trucks for each city with route data
    const trucks = [
      {
        city: 'Mumbai',
        truck_number: 'MH01-001',
        route: {
          route_name: 'Marine Drive Route',
          polyline: [
            { lat: 19.0760, lng: 72.8777 },
            { lat: 19.0765, lng: 72.8780 },
            { lat: 19.0770, lng: 72.8785 },
            { lat: 19.0775, lng: 72.8790 },
            { lat: 19.0780, lng: 72.8795 }
          ],
          polygon: [
            { lat: 19.0750, lng: 72.8760 },
            { lat: 19.0790, lng: 72.8760 },
            { lat: 19.0790, lng: 72.8800 },
            { lat: 19.0750, lng: 72.8800 }
          ]
        },
        controller_id: 'TRUCK_MH01_001'
      },
      {
        city: 'Mumbai',
        truck_number: 'MH01-002',
        route: {
          route_name: 'Bandra Route',
          polyline: [
            { lat: 19.0544, lng: 72.8406 },
            { lat: 19.0550, lng: 72.8410 },
            { lat: 19.0555, lng: 72.8415 },
            { lat: 19.0560, lng: 72.8420 },
            { lat: 19.0565, lng: 72.8425 }
          ],
          polygon: [
            { lat: 19.0530, lng: 72.8390 },
            { lat: 19.0580, lng: 72.8390 },
            { lat: 19.0580, lng: 72.8440 },
            { lat: 19.0530, lng: 72.8440 }
          ]
        },
        controller_id: 'TRUCK_MH01_002'
      },
      {
        city: 'Delhi',
        truck_number: 'DL01-001',
        route: {
          route_name: 'Connaught Place Route',
          polyline: [
            { lat: 28.6315, lng: 77.2167 },
            { lat: 28.6320, lng: 77.2170 },
            { lat: 28.6325, lng: 77.2175 },
            { lat: 28.6330, lng: 77.2180 },
            { lat: 28.6335, lng: 77.2185 }
          ],
          polygon: [
            { lat: 28.6300, lng: 77.2150 },
            { lat: 28.6350, lng: 77.2150 },
            { lat: 28.6350, lng: 77.2200 },
            { lat: 28.6300, lng: 77.2200 }
          ]
        },
        controller_id: 'TRUCK_DL01_001'
      },
      {
        city: 'Delhi',
        truck_number: 'DL01-002',
        route: {
          route_name: 'Karol Bagh Route',
          polyline: [
            { lat: 28.6514, lng: 77.1909 },
            { lat: 28.6520, lng: 77.1915 },
            { lat: 28.6525, lng: 77.1920 },
            { lat: 28.6530, lng: 77.1925 },
            { lat: 28.6535, lng: 77.1930 }
          ],
          polygon: [
            { lat: 28.6500, lng: 77.1890 },
            { lat: 28.6550, lng: 77.1890 },
            { lat: 28.6550, lng: 77.1940 },
            { lat: 28.6500, lng: 77.1940 }
          ]
        },
        controller_id: 'TRUCK_DL01_002'
      },
      {
        city: 'Bangalore',
        truck_number: 'KA01-001',
        route: {
          route_name: 'MG Road Route',
          polyline: [
            { lat: 12.9716, lng: 77.5946 },
            { lat: 12.9720, lng: 77.5950 },
            { lat: 12.9725, lng: 77.5955 },
            { lat: 12.9730, lng: 77.5960 },
            { lat: 12.9735, lng: 77.5965 }
          ],
          polygon: [
            { lat: 12.9700, lng: 77.5930 },
            { lat: 12.9750, lng: 77.5930 },
            { lat: 12.9750, lng: 77.5980 },
            { lat: 12.9700, lng: 77.5980 }
          ]
        },
        controller_id: 'TRUCK_KA01_001'
      },
      {
        city: 'Bangalore',
        truck_number: 'KA01-002',
        route: {
          route_name: 'Koramangala Route',
          polyline: [
            { lat: 12.9279, lng: 77.6271 },
            { lat: 12.9285, lng: 77.6275 },
            { lat: 12.9290, lng: 77.6280 },
            { lat: 12.9295, lng: 77.6285 },
            { lat: 12.9300, lng: 77.6290 }
          ],
          polygon: [
            { lat: 12.9260, lng: 77.6250 },
            { lat: 12.9310, lng: 77.6250 },
            { lat: 12.9310, lng: 77.6300 },
            { lat: 12.9260, lng: 77.6300 }
          ]
        },
        controller_id: 'TRUCK_KA01_002'
      },
      {
        city: 'Chennai',
        truck_number: 'TN01-001',
        route: {
          route_name: 'T. Nagar Route',
          polyline: [
            { lat: 13.0418, lng: 80.2341 },
            { lat: 13.0425, lng: 80.2345 },
            { lat: 13.0430, lng: 80.2350 },
            { lat: 13.0435, lng: 80.2355 },
            { lat: 13.0440, lng: 80.2360 }
          ],
          polygon: [
            { lat: 13.0400, lng: 80.2320 },
            { lat: 13.0450, lng: 80.2320 },
            { lat: 13.0450, lng: 80.2370 },
            { lat: 13.0400, lng: 80.2370 }
          ]
        },
        controller_id: 'TRUCK_TN01_001'
      },
      {
        city: 'Chennai',
        truck_number: 'TN01-002',
        route: {
          route_name: 'Anna Salai Route',
          polyline: [
            { lat: 13.0827, lng: 80.2707 },
            { lat: 13.0835, lng: 80.2710 },
            { lat: 13.0840, lng: 80.2715 },
            { lat: 13.0845, lng: 80.2720 },
            { lat: 13.0850, lng: 80.2725 }
          ],
          polygon: [
            { lat: 13.0810, lng: 80.2680 },
            { lat: 13.0860, lng: 80.2680 },
            { lat: 13.0860, lng: 80.2730 },
            { lat: 13.0810, lng: 80.2730 }
          ]
        },
        controller_id: 'TRUCK_TN01_002'
      },
      {
        city: 'Kolkata',
        truck_number: 'WB01-001',
        route: {
          route_name: 'Park Street Route',
          polyline: [
            { lat: 22.5726, lng: 88.3639 },
            { lat: 22.5730, lng: 88.3645 },
            { lat: 22.5735, lng: 88.3650 },
            { lat: 22.5740, lng: 88.3655 },
            { lat: 22.5745, lng: 88.3660 }
          ],
          polygon: [
            { lat: 22.5710, lng: 88.3620 },
            { lat: 22.5760, lng: 88.3620 },
            { lat: 22.5760, lng: 88.3670 },
            { lat: 22.5710, lng: 88.3670 }
          ]
        },
        controller_id: 'TRUCK_WB01_001'
      },
      {
        city: 'Kolkata',
        truck_number: 'WB01-002',
        route: {
          route_name: 'Salt Lake Route',
          polyline: [
            { lat: 22.5937, lng: 88.4161 },
            { lat: 22.5945, lng: 88.4165 },
            { lat: 22.5950, lng: 88.4170 },
            { lat: 22.5955, lng: 88.4175 },
            { lat: 22.5960, lng: 88.4180 }
          ],
          polygon: [
            { lat: 22.5920, lng: 88.4140 },
            { lat: 22.5970, lng: 88.4140 },
            { lat: 22.5970, lng: 88.4190 },
            { lat: 22.5920, lng: 88.4190 }
          ]
        },
        controller_id: 'TRUCK_WB01_002'
      }
    ];

    for (const truckData of trucks) {
      const city = createdCities.find(c => c.name === truckData.city);
      if (city) {
        const existingTruck = await Truck.findOne({ controller_id: truckData.controller_id });
        if (!existingTruck) {
          const truck = new Truck({
            city_id: city._id,
            truck_number: truckData.truck_number,
            route: {
              route_name: truckData.route.route_name,
              polyline: truckData.route.polyline,
              polygon: truckData.route.polygon
            },
            controller_id: truckData.controller_id,
            status: 'offline',
            gps_lat: city.coordinates.lat + (Math.random() - 0.5) * 0.01,
            gps_lng: city.coordinates.lng + (Math.random() - 0.5) * 0.01,
            storage_mb: Math.floor(Math.random() * 1000) + 500,
            battery_percent: Math.floor(Math.random() * 100)
          });
          await truck.save();
          console.log(`Created truck: ${truck.truck_number} (${truckData.route.route_name}) in ${city.name}`);
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
