const passport = require('passport');
require('../config/passport');
const { sendAccessError } = require('../utils/accessError');

const checkBearerToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return sendAccessError(res, 401, 'AUTH_TOKEN_MISSING', 'Không có token xác thực.');
    }
    if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) {
        return sendAccessError(res, 401, 'AUTH_HEADER_INVALID', 'Thông tin xác thực không đúng định dạng.');
    }
    return passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            if (info && info.name === 'TokenExpiredError') {
                return sendAccessError(res, 401, 'AUTH_TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            }
            if (info && ['JsonWebTokenError', 'NotBeforeError'].includes(info.name)) {
                return sendAccessError(res, 401, 'AUTH_TOKEN_INVALID', 'Token xác thực không hợp lệ. Vui lòng đăng nhập lại.');
            }
            return sendAccessError(res, 401, 'AUTH_USER_UNAVAILABLE', 'Thông tin xác thực không còn hợp lệ hoặc tài khoản không hoạt động. Vui lòng đăng nhập lại.');
        }
        req.user = user;
        return next();
    })(req, res, next);
};

module.exports = checkBearerToken;
