const passport = require('passport')
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt')
const User = require('../models/user');
const Admin = require('../models/admin');
const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
};
passport.use(
    new JwtStrategy(options, async (jwtPayload, done) => {
        try {
            const user = await User.findById(jwtPayload.userId).populate('role');
            if (user && user.status === 'active') {
                return done(null, user);
            }
            const admin = await Admin.findById(jwtPayload.userId).populate('role');
            if (admin) {
                return done(null, admin);
            }
            return done(null, false);
        } catch (error) {
            return done(error, false);
        }
    })
);
module.exports = passport
