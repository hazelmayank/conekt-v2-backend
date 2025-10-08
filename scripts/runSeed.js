const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const { seedDatabase } = require('./seed');

const runSeed = async () => {
  await connectDB();
  await seedDatabase();
  process.exit(0);
};

runSeed();
