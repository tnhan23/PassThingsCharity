require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');
const retireVolunteerRole = require('../services/retireVolunteerRole');

async function main() {
  const connectionDeadline = setTimeout(() => {
    console.error('Role migration could not connect to MongoDB within 15 seconds. No migration was started.');
    process.exit(1);
  }, 15000);
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    clearTimeout(connectionDeadline);
    console.log(JSON.stringify(await retireVolunteerRole()));
  } catch (error) {
    console.error('Role migration failed:', error.code || error.name);
    process.exitCode = 1;
  } finally {
    clearTimeout(connectionDeadline);
    await mongoose.disconnect();
  }
}

main();
