const { sendAccessError } = require('../utils/accessError');

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendAccessError(res, 401, 'AUTH_REQUIRED', 'Request chưa có thông tin xác thực hợp lệ để kiểm tra quyền truy cập.');
        }
        const currentUserRole = req.user.role && req.user.role.name;
        if (allowedRoles.includes(currentUserRole)) {
            next();
        }
        else {
            return sendAccessError(res, 403, 'FORBIDDEN',
                `Bạn không có quyền truy cập. Yêu cầu quyền ${allowedRoles.join(' hoặc ')} để thực hiện hành động này.`);
        };
    };
};
module.exports = checkRole;
