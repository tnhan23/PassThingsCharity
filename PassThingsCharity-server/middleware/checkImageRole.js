const checkRole = require('./checkRole');

const roles = {
  users: ['ADMIN', 'USER', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF'],
  organizations: ['ADMIN', 'ORG_MANAGER', 'USER'],
  stations: ['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER'],
  campaigns: ['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER'],
  'item-categories': ['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER'],
  'item-types': ['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER'],
  achievements: ['ADMIN', 'ORG_MANAGER', 'STATION_MANAGER'],
};

module.exports = function checkImageRole(req, res, next) {
  const allowed = Object.hasOwn(roles, req.params.resource) && roles[req.params.resource];
  if (!allowed) return res.status(400).json({ error: 'Unsupported image resource.' });
  return checkRole(allowed)(req, res, next);
};
