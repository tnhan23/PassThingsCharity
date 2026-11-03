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
  AdminLoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', example: 'admin_master' },
      password: { type: 'string', example: 'Admin@123456' },
    },
  },
  AdminRegisterRequest: {
    type: 'object',
    required: ['email', 'username', 'password', 'fullname', 'phone'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@passthings.org' },
      username: { type: 'string', example: 'admin_master' },
      password: { type: 'string', format: 'password', example: 'Admin@123456' },
      fullname: { type: 'string', example: 'Nguyễn Quản Trị' },
      phone: { type: 'string', example: '0987654321', description: 'Số điện thoại đúng 10 chữ số' },
    },
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', format: 'password', example: 'Admin@123456' },
      newPassword: { type: 'string', format: 'password', minLength: 8, example: 'Admin@654321' },
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
    required: ['name', 'address', 'latitude', 'longitude'],
    properties: {
      name: { type: 'string', example: 'Trạm Tiếp Nhận Quận 1' },
      address: { type: 'string', example: 'Số 1 Đinh Tiên Hoàng, Q1, TP.HCM' },
      organizationId: { type: 'string', example: '671000000000000000000001' },
      latitude: { type: 'string', example: '10.776889', description: 'Vĩ độ (Latitude)' },
      longitude: { type: 'string', example: '106.700806', description: 'Kinh độ (Longitude)' },
      openingTime: { type: 'string', example: '08:00', description: 'Giờ mở cửa' },
      closingTime: { type: 'string', example: '17:00', description: 'Giờ đóng cửa' },
    },
  },
  StationUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      name: { type: 'string', example: 'Trạm Tiếp Nhận Quận 1' },
      address: { type: 'string', example: 'Số 1 Đinh Tiên Hoàng, Q1, TP.HCM' },
      latitude: { type: 'string', example: '10.776889', description: 'Vĩ độ (Latitude)' },
      longitude: { type: 'string', example: '106.700806', description: 'Kinh độ (Longitude)' },
      openingTime: { type: 'string', example: '08:00', description: 'Giờ mở cửa' },
      closingTime: { type: 'string', example: '17:00', description: 'Giờ đóng cửa' },
      isActive: { type: 'boolean', example: true },
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
  // ==========================================
  // BE3 SCHEMAS (OPERATIONS, TRANSFER, RELIEF, WORKFORCE)
  // ==========================================
  ContributionRequest: {
    type: 'object',
    required: ['userId', 'stationId', 'campaignId', 'items'],
    properties: {
      userId: { type: 'string', example: '6acbbb6a7faf5d01bb5261e7' },
      stationId: { type: 'string', example: '671000000000000000000011' },
      campaignId: { type: 'string', example: '6acdef2e9fc3bf0d61d9d00b' },
      notes: { type: 'string', example: 'Quyên góp quần áo ấm và mì tôm' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['itemTypeId', 'quantity', 'unit'],
          properties: {
            itemTypeId: { type: 'string', example: '6523456789abcdef00000202' },
            quantity: { type: 'number', minimum: 0.1, example: 10 },
            unit: { type: 'string', enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'], example: 'BOX' },
            note: { type: 'string', example: '10 thùng mì Hảo Hảo còn nguyên vẹn' },
          },
        },
      },
      imageUrls: {
        type: 'array',
        items: { type: 'string', format: 'uri', example: 'https://example.com/donation1.jpg' },
      },
    },
  },
  ContributionStatusUpdateRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'], example: 'COMPLETED' },
      notes: { type: 'string', example: 'Đã hoàn tất kiểm tra và lưu kho' },
    },
  },
  ContributionImageRequest: {
    type: 'object',
    required: ['imageUrls'],
    properties: {
      imageUrls: {
        type: 'array',
        items: { type: 'string', format: 'uri', example: 'https://example.com/proof.jpg' },
      },
    },
  },
  CampaignTransferRequest: {
    type: 'object',
    required: ['campaignId', 'fromStationId', 'toStationId', 'items'],
    properties: {
      campaignId: { type: 'string', example: '6acdef2e9fc3bf0d61d9d00b' },
      fromStationId: { type: 'string', example: '671000000000000000000011' },
      toStationId: { type: 'string', example: '671000000000000000000012' },
      responsibleUserId: { type: 'string', example: '6acbbb6a7faf5d01bb5261e4' },
      transportMethod: { type: 'string', example: 'Xe tải 2.5 tấn' },
      transportNote: { type: 'string', example: 'Chuyển hàng sang trạm trung tâm bằng xe tải 2 tấn' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['itemTypeId', 'quantity', 'unit'],
          properties: {
            itemTypeId: { type: 'string', example: '6523456789abcdef00000202' },
            quantity: { type: 'number', minimum: 0.1, example: 50 },
            unit: { type: 'string', enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'], example: 'BOX' },
          },
        },
      },
    },
  },
  CampaignTransferStatusUpdateRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: ['PENDING', 'PREPARING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED'],
        example: 'IN_TRANSIT',
      },
      transportMethod: { type: 'string', example: 'Xe tải 2.5 tấn' },
      transportNote: { type: 'string', example: 'Xe đang di chuyển trên quốc lộ 1A' },
      responsibleUserId: { type: 'string', example: '6acbbb6a7faf5d01bb5261e4' },
      receivedBy: { type: 'string', example: '6ac7b15a501de8a3e18592c9' },
    },
  },
  ReliefDistributionRequest: {
    type: 'object',
    required: ['campaignId', 'stationId', 'recipientName', 'recipientAddress', 'items'],
    properties: {
      campaignId: { type: 'string', example: '6acdef2e9fc3bf0d61d9d00b' },
      stationId: { type: 'string', example: '671000000000000000000011' },
      recipientName: { type: 'string', example: 'Ông Nguyễn Văn B - Chủ tịch MTTQ Xã' },
      recipientRole: { type: 'string', example: 'Đại diện chính quyền địa phương' },
      recipientPhone: { type: 'string', example: '0988776655' },
      recipientAddress: { type: 'string', example: 'UBND Xã Lộc An, Huyện Phú Lộc, Thừa Thiên Huế' },
      distributionDate: { type: 'string', format: 'date-time', example: '2026-10-20T10:00:00.000Z' },
      status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'PLANNED' },
      notes: { type: 'string', example: 'Bàn giao đợt 1 gồm 100 thùng mì và 50 KG quần áo ấm' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['itemTypeId', 'quantity', 'unit'],
          properties: {
            itemTypeId: { type: 'string', example: '6523456789abcdef00000202' },
            quantity: { type: 'number', minimum: 0.1, example: 100 },
            unit: { type: 'string', enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'], example: 'BOX' },
          },
        },
      },
      closeCampaign: { type: 'boolean', example: false },
    },
  },
  ReliefDistributionStatusUpdateRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'COMPLETED' },
      notes: { type: 'string', example: 'Đã hoàn tất bàn giao đầy đủ cho địa phương' },
      closeCampaign: { type: 'boolean', example: true },
    },
  },
  VolunteerRegisterRequest: {
    type: 'object',
    required: ['campaignId'],
    properties: {
      campaignId: { type: 'string', example: '6acdef2e9fc3bf0d61d9d00b' },
      note: { type: 'string', example: 'Tôi có thể hỗ trợ khuân vác và phân loại hàng vào cuối tuần' },
    },
  },
  VolunteerStatusUpdateRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['APPROVED', 'REJECTED', 'CANCELLED'], example: 'APPROVED' },
      note: { type: 'string', example: 'Đã duyệt tham gia đội tiếp nhận đồ' },
    },
  },
  TaskRequest: {
    type: 'object',
    required: ['campaignId', 'stationId', 'title'],
    properties: {
      campaignId: { type: 'string', example: '6acdef2e9fc3bf0d61d9d00b' },
      stationId: { type: 'string', example: '671000000000000000000011' },
      transferId: { type: 'string', example: '6523456789abcdef00000d01' },
      title: { type: 'string', example: 'Bốc xếp và chuyển hàng lên xe tải' },
      description: { type: 'string', example: 'Hỗ trợ tài xế bốc 50 thùng mì và 20 kiện đồ' },
      startTime: { type: 'string', format: 'date-time', example: '2026-10-16T08:00:00.000Z' },
      endTime: { type: 'string', format: 'date-time', example: '2026-10-16T12:00:00.000Z' },
      recruitmentStatus: { type: 'string', enum: ['NOT_OPEN', 'OPEN', 'FILLED', 'CLOSED'], example: 'OPEN' },
      requiredVolunteers: { type: 'integer', example: 5 },
      volunteerDeadline: { type: 'string', format: 'date-time', example: '2026-10-16T07:00:00.000Z' },
      rewardPoints: { type: 'integer', example: 50 },
    },
  },
  TaskUpdateRequest: {
    type: 'object',
    properties: {
      title: { type: 'string', example: 'Bốc xếp và chuyển hàng lên xe tải' },
      description: { type: 'string', example: 'Đã bổ sung băng keo dán thùng' },
      transferId: { type: 'string', example: '6523456789abcdef00000d01' },
      startTime: { type: 'string', format: 'date-time' },
      endTime: { type: 'string', format: 'date-time' },
      status: { type: 'string', enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], example: 'IN_PROGRESS' },
      recruitmentStatus: { type: 'string', enum: ['NOT_OPEN', 'OPEN', 'FILLED', 'CLOSED'], example: 'OPEN' },
      requiredVolunteers: { type: 'integer', example: 5 },
      volunteerDeadline: { type: 'string', format: 'date-time' },
      rewardPoints: { type: 'integer', example: 50 },
    },
  },
  TaskApplicationRequest: {
    type: 'object',
    properties: {
      note: { type: 'string', example: 'Tôi có sức khỏe tốt và đã từng tham gia tình nguyện nhiều lần' },
    },
  },
  TaskApplicationReviewRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['APPROVED', 'REJECTED', 'CANCELLED'], example: 'APPROVED' },
      note: { type: 'string', example: 'Đã xét duyệt và giao nhiệm vụ' },
    },
  },
  TaskAssignRequest: {
    type: 'object',
    required: ['taskId', 'assigneeId', 'assigneeType'],
    properties: {
      taskId: { type: 'string', example: '6523456789abcdef00000901' },
      assigneeId: { type: 'string', example: '6acbbb6a7faf5d01bb5261e6' },
      assigneeType: { type: 'string', enum: ['STAFF', 'VOLUNTEER'], example: 'VOLUNTEER' },
    },
  },
  TaskCheckInRequest: {
    type: 'object',
    required: ['assignmentId'],
    properties: {
      assignmentId: { type: 'string', example: '6523456789abcdef00000911' },
    },
  },
  TaskCheckOutRequest: {
    type: 'object',
    required: ['assignmentId'],
    properties: {
      assignmentId: { type: 'string', example: '6523456789abcdef00000911' },
      hoursSpent: { type: 'number', minimum: 0.1, example: 4 },
      completionNote: { type: 'string', example: 'Đã hoàn tất phân loại 20 thùng quần áo' },
    },
  },
};

