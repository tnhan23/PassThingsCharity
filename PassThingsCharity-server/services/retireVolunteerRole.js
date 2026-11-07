const Role = require('../models/role');
const User = require('../models/user');
const Admin = require('../models/admin');
const Notification = require('../models/notification');

// Safe to rerun: move references before deleting the obsolete account role.
// Task participation types and historical point transactions are unchanged.
module.exports = async function retireVolunteerRole() {
  const legacyRoles = await Role.find({ name: 'VOLUNTEER' }).select('_id').lean();
  const legacyIds = legacyRoles.map(role => role._id);
  let usersUpdated = 0;
  let adminsUpdated = 0;
  if (legacyIds.length) {
    const userRole = await Role.findOne({ name: 'USER' });
    if (!userRole) throw new Error('Create the USER role before retiring VOLUNTEER.');
    const users = await User.updateMany({ role: { $in: legacyIds } }, { $set: { role: userRole._id } });
    const admins = await Admin.updateMany({ role: { $in: legacyIds } }, { $set: { role: userRole._id } });
    usersUpdated = users.modifiedCount;
    adminsUpdated = admins.modifiedCount;
  }
  const notifications = await Notification.updateMany(
    { targetRole: 'VOLUNTEER' }, { $set: { targetRole: 'USER' } }
  );
  const removed = await Role.deleteMany({ _id: { $in: legacyIds }, name: 'VOLUNTEER' });
  return { usersUpdated, adminsUpdated, notificationsUpdated: notifications.modifiedCount, rolesDeleted: removed.deletedCount };
};
