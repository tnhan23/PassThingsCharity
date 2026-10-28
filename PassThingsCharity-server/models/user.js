const mongoose = require('mongoose')
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false, },
    fullName: { type: String, required: true },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'banned'],
        default: 'active'
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    avatarUrl: {
        type: String,
        trim: true,
        default: '',
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
}, { versionKey: false, timestamps: true })
module.exports = mongoose.model('User', userSchema)