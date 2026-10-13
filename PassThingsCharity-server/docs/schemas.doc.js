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
  // BE2 Schemas
  ItemCategoryRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Thực phẩm' },
      description: { type: 'string', example: 'Các loại thực phẩm, đồ khô, đồ hộp cứu trợ' },
    },
  },
  ItemCategoryUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      name: { type: 'string', example: 'Thực phẩm' },
      description: { type: 'string', example: 'Các loại thực phẩm, đồ khô, đồ hộp cứu trợ' },
      isActive: { type: 'boolean', example: true },
    },
  },
  ItemTypeRequest: {
    type: 'object',
    required: ['categoryId', 'name', 'unit'],
    properties: {
      categoryId: { type: 'string', example: '6523456789abcdef00000101' },
      name: { type: 'string', example: 'Mì gói' },
      unit: { type: 'string', enum: ['KG', 'PAIR', 'BOX', 'PACK'], example: 'BOX' },
      description: { type: 'string', example: 'Thùng mì gói các loại' },
    },
  },
  ItemTypeUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      categoryId: { type: 'string', example: '6523456789abcdef00000101' },
      name: { type: 'string', example: 'Mì gói' },
      unit: { type: 'string', enum: ['KG', 'PAIR', 'BOX', 'PACK'], example: 'BOX' },
      description: { type: 'string', example: 'Thùng mì gói các loại' },
      isActive: { type: 'boolean', example: true },
    },
  },
  CampaignRequest: {
    type: 'object',
    description: 'Campaign duration must be between 120 and 168 hours.',
    required: ['title', 'startDate', 'endDate', 'organizationId'],
    properties: {
      title: { type: 'string', example: 'Cứu trợ lũ lụt Miền Trung 2026' },
      description: { type: 'string', example: 'Chiến dịch quyên góp vật phẩm cứu trợ bà con vùng lũ' },
      startDate: { type: 'string', format: 'date-time', example: '2026-10-15T00:00:00.000Z' },
      endDate: { type: 'string', format: 'date-time', example: '2026-10-20T00:00:00.000Z' },
      organizationId: { type: 'string', example: '671000000000000000000001' },
    },
  },
  CampaignUpdateRequest: {
    type: 'object',
    description: 'If either date is changed, the resulting campaign duration must be between 120 and 168 hours.',
    minProperties: 1,
    properties: {
      title: { type: 'string', example: 'Cứu trợ lũ lụt Miền Trung 2026' },
      description: { type: 'string', example: 'Chiến dịch quyên góp vật phẩm cứu trợ bà con vùng lũ' },
      startDate: { type: 'string', format: 'date-time', example: '2026-10-15T00:00:00.000Z' },
      endDate: { type: 'string', format: 'date-time', example: '2026-10-20T00:00:00.000Z' },
    },
  },
  CampaignItemRequest: {
    type: 'object',
    required: ['itemTypeId', 'targetQuantity'],
    properties: {
      itemTypeId: { type: 'string', example: '6523456789abcdef00000102' },
      targetQuantity: { type: 'number', example: 500 },
      priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' },
    },
  },
  AwardPointsRequest: {
    type: 'object',
    description: 'Points and point rewards are whole numbers.',
    required: ['userId', 'points', 'type'],
    properties: {
      userId: { type: 'string', example: '6ac7b15a501de8a3e18592ca' },
      points: { type: 'integer', minimum: 1, example: 50 },
      type: { type: 'string', enum: ['DONATION', 'VOLUNTEER_TASK', 'BONUS', 'SYSTEM'], example: 'DONATION' },
      sourceId: { type: 'string', example: '6523456789abcdef00000601' },
      description: { type: 'string', example: 'Thưởng điểm quyên góp 10 KG quần áo' },
    },
  },
  AchievementRequest: {
    type: 'object',
    description: 'MVP achievement criteria supported: donation count and accumulated points.',
    required: ['title', 'criteriaType', 'criteriaValue'],
    properties: {
      title: { type: 'string', example: 'Chiến Sĩ Áo Xanh' },
      description: { type: 'string', example: 'Hoàn thành 1 lần quyên góp thành công' },
      badgeIconUrl: { type: 'string', example: 'https://example.com/badge.png' },
      criteriaType: { type: 'string', enum: ['DONATION_COUNT', 'POINTS_ACCUMULATED'], example: 'DONATION_COUNT' },
      criteriaValue: { type: 'integer', minimum: 1, example: 5 },
      pointsReward: { type: 'integer', minimum: 0, example: 100 },
    },
  },
  CertificateRequest: {
    type: 'object',
    required: ['userId', 'certificateType', 'title'],
    properties: {
      userId: { type: 'string', example: '6ac7b15a501de8a3e18592ca' },
      campaignId: { type: 'string', example: '6acdef2e9fc3bf0d61d9d00b' },
      certificateType: { type: 'string', enum: ['VOLUNTEER', 'DONOR'], example: 'DONOR' },
      title: { type: 'string', example: 'Giấy Chứng Nhận Tấm Lòng Vàng' },
      content: { type: 'string', example: 'Xác nhận đã tích cực đóng góp cứu trợ miền Trung' },
      pdfUrl: { type: 'string', format: 'uri', example: 'https://example.com/certificate.pdf' },
    },
  },
};
