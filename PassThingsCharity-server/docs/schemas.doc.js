module.exports = {
  ErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Thông báo lỗi chi tiết' },
    },
  },
  LoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', example: 'admin_system' },
      password: { type: 'string', example: '123456' },
    },
  },
  RegisterRequest: {
    type: 'object',
    required: ['email', 'username', 'password', 'fullname', 'phone'],
    properties: {
      email: { type: 'string', example: 'user02@example.com' },
      username: { type: 'string', example: 'user_test_02' },
      password: { type: 'string', example: '123456' },
      fullname: { type: 'string', example: 'Nguyễn Văn A' },
      phone: { type: 'string', example: '0912345678' },
    },
  },
  OrganizationRequest: {
    type: 'object',
    required: ['name', 'code', 'address', 'phone', 'email'],
    properties: {
      name: { type: 'string', example: 'Quỹ Từ Thiện Ánh Sáng' },
      code: { type: 'string', example: 'ORG-LIGHT-01' },
      address: { type: 'string', example: '123 Đường Nguyễn Huệ, Q1, TP.HCM' },
      phone: { type: 'string', example: '0909123456' },
      email: { type: 'string', example: 'contact@anhsang.org' },
    },
  },
  StationRequest: {
    type: 'object',
    required: ['name', 'address'],
    properties: {
      name: { type: 'string', example: 'Trạm Tiếp Nhận Quận 1' },
      address: { type: 'string', example: 'Số 1 Đinh Tiên Hoàng, Q1, TP.HCM' },
      organizationId: { type: 'string', example: '671000000000000000000001' },
    },
  },
};
