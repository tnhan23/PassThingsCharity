require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');
const Organization = require('../models/organization');
const Station = require('../models/station');
const User = require('../models/user');
const Campaign = require('../models/campaign');
const ItemType = require('../models/itemType');
const Inventory = require('../models/inventory');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- DB INSPECTION ---');

  const orgs = await Organization.find({ isVerified: true }).lean();
  console.log('Verified Orgs:', orgs.map(o => ({ id: o._id, name: o.name, code: o.code })));

  const stations = await Station.find({ isActive: true }).lean();
  console.log('Active Stations:', stations.map(s => ({ id: s._id, name: s.name, address: s.address, closingTime: s.closingTime })));

  const users = await User.find({ status: 'active' }).populate('role').lean();
  console.log('Active Users:', users.map(u => ({ id: u._id, username: u.username, role: u.role?.name })));

  const items = await ItemType.find({ isActive: true }).lean();
  console.log('Active Item Types:', items.map(i => ({ id: i._id, name: i.name, unit: i.unit })));

  const campaigns = await Campaign.find().lean();
  console.log('Campaigns:', campaigns.map(c => ({ id: c._id, title: c.title, status: c.status })));

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
