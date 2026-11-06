const mongoose = require('mongoose');
const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['ADMIN','ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER']
    },
    description: {
        type: String
    }
});
module.exports = mongoose.model('Role', roleSchema)