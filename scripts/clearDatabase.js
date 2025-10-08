const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  try {
    await connectDB();
    
    console.log('Clearing database...');
    
    // Clear all collections
    const collections = ['users', 'cities', 'trucks', 'videos', 'campaigns', 'playlists', 'auditlogs'];
    
    for (const collectionName of collections) {
      const collection = mongoose.connection.collection(collectionName);
      const result = await collection.deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${collectionName}`);
    }
    
    console.log('Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database clear error:', error);
    process.exit(1);
  }
};

clearDatabase();
