module.exports = {
  '/contributions/upload-images': {
    post: {
      tags: ['BE3 - Operations & Inbound'],
      summary: 'Upload staff evidence images to the configured BE3 Cloudinary folder',
      description: 'Upload first, then pass the returned imageUrls to POST /contributions or POST /contributions/{id}/images. Images are auto-oriented, metadata removed, flattened onto white, resized within 1600px and compressed to JPEG up to 500 KB. Response includes originalBytes, bytes, width and height. If a later file fails, the error response includes successfully uploaded URLs.',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object', required: ['images'],
              properties: { images: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', format: 'binary' }, description: 'JPEG, PNG or WebP; maximum 5 MB per image.' } },
            },
          },
        },
      },
      responses: {
        201: { description: 'Uploaded images and imageUrls' },
        400: { description: 'Invalid image or multipart fields' },
        401: { description: 'Authentication required' },
        403: { description: 'Staff, station manager or admin role required' },
        413: { description: 'Image exceeds 5 MB' },
        502: { description: 'Cloudinary upload failed' },
        503: { description: 'Cloudinary BE3 configuration missing' },
      },
    },
  },
  // ==========================================
  // INBOUND CONTRIBUTIONS
  // ==========================================
  '/contributions/lookup': {
    get: {
      tags: ['BE3 - Operations & Inbound'],
      summary: 'Staff tra cứu thông tin Donor khi đến gửi đồ (SĐT, Email, Username, Tên)',
      parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Số điện thoại, email hoặc username của Donor' },
      ],
      responses: {
        200: { description: 'Danh sách Donor tìm thấy' },
        400: { description: 'Thiếu từ khóa tìm kiếm' },
      },
    },
  },
  '/contributions': {
    post: {
      tags: ['BE3 - Operations & Inbound'],
      summary: 'Tiếp nhận quyên góp tại trạm (Tự động cập nhật tiến độ Campaign & cộng điểm Gamification)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ContributionRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tiếp nhận thành công' },
        400: { description: 'Dữ liệu không hợp lệ' },
        404: { description: 'Không tìm thấy Campaign, Station hoặc Donor' },
      },
    },
    get: {
      tags: ['BE3 - Operations & Inbound'],
      summary: 'Danh sách các phiếu tiếp nhận đồ quyên góp',
      parameters: [
        { name: 'campaignId', in: 'query', schema: { type: 'string' }, description: 'Lọc theo Chiến dịch' },
        { name: 'stationId', in: 'query', schema: { type: 'string' }, description: 'Lọc theo Trạm' },
        { name: 'userId', in: 'query', schema: { type: 'string' }, description: 'Lọc theo Donor' },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'] } },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Tìm theo mã code phiếu' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Danh sách phiếu tiếp nhận' },
      },
    },
  },
  '/contributions/{id}': {
    get: {
      tags: ['BE3 - Operations & Inbound'],
      summary: 'Xem chi tiết 1 phiếu tiếp nhận (Kèm danh sách đồ & ảnh xác minh)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết phiếu tiếp nhận' },
        404: { description: 'Không tìm thấy phiếu' },
      },
    },
  },
  '/contributions/{id}/status': {
    patch: {
      tags: ['BE3 - Operations & Inbound'],
      summary: 'Cập nhật trạng thái phiếu tiếp nhận (Tự rollback số lượng nếu REJECTED)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ContributionStatusUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
        400: { description: 'Trạng thái không hợp lệ' },
      },
    },
  },
  '/contributions/{id}/images': {
    post: {
      tags: ['BE3 - Operations & Inbound'],
      summary: 'Bổ sung ảnh minh chứng cho phiếu tiếp nhận',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ContributionImageRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Đã thêm ảnh thành công' },
      },
    },
  },

  // ==========================================
  // INTER-STATION TRANSFERS
  // ==========================================
  '/transfers': {
    post: {
      tags: ['BE3 - Inter-Station Transfers'],
      summary: 'Tạo lệnh điều phối/vận chuyển vật phẩm từ Trạm A sang Trạm B',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignTransferRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo lệnh điều phối thành công' },
        400: { description: 'Dữ liệu không hợp lệ hoặc 2 trạm trùng nhau' },
      },
    },
    get: {
      tags: ['BE3 - Inter-Station Transfers'],
      summary: 'Danh sách các lệnh điều phối hàng giữa các trạm',
      parameters: [
        { name: 'campaignId', in: 'query', schema: { type: 'string' } },
        { name: 'fromStationId', in: 'query', schema: { type: 'string' } },
        { name: 'toStationId', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PREPARING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Danh sách lệnh điều phối' },
      },
    },
  },
  '/transfers/{id}': {
    get: {
      tags: ['BE3 - Inter-Station Transfers'],
      summary: 'Xem chi tiết lệnh điều phối kèm danh sách vật phẩm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết lệnh điều phối' },
        404: { description: 'Không tìm thấy' },
      },
    },
  },
  '/transfers/{id}/status': {
    patch: {
      tags: ['BE3 - Inter-Station Transfers'],
      summary: 'Cập nhật tiến độ lệnh điều phối (PENDING -> PREPARING -> IN_TRANSIT -> RECEIVED -> COMPLETED)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignTransferStatusUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
  },

  // ==========================================
  // RELIEF DISTRIBUTION
  // ==========================================
  '/relief': {
    post: {
      tags: ['BE3 - Relief Distribution'],
      summary: 'Ghi nhận đợt xuất bàn giao hàng cứu trợ cho đại diện địa phương (Hỗ trợ đóng Campaign)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ReliefDistributionRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Ghi nhận phân phối cứu trợ thành công' },
      },
    },
    get: {
      tags: ['BE3 - Relief Distribution'],
      summary: 'Danh sách các đợt bàn giao hàng cứu trợ',
      parameters: [
        { name: 'campaignId', in: 'query', schema: { type: 'string' } },
        { name: 'stationId', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Danh sách đợt cứu trợ' },
      },
    },
  },
  '/relief/{id}': {
    get: {
      tags: ['BE3 - Relief Distribution'],
      summary: 'Chi tiết đợt bàn giao cứu trợ',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết đợt cứu trợ' },
      },
    },
  },
  '/relief/{id}/status': {
    patch: {
      tags: ['BE3 - Relief Distribution'],
      summary: 'Cập nhật trạng thái đợt cứu trợ (PLANNED -> IN_PROGRESS -> COMPLETED)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ReliefDistributionStatusUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
  },
  '/relief/summary/{campaignId}': {
    get: {
      tags: ['BE3 - Relief Distribution'],
      summary: 'Báo cáo tổng hợp số lượng mục tiêu vs tiếp nhận vs đã cứu trợ của Campaign',
      parameters: [
        { name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Báo cáo cứu trợ tổng thể' },
      },
    },
  },

  // ==========================================
  // WORKFORCE & VOLUNTEERS (CAMPAIGN LEVEL)
  // ==========================================
  '/workforce/volunteers/register': {
    post: {
      tags: ['BE3 - Workforce & Volunteers'],
      summary: 'Tình nguyện viên đăng ký tham gia chiến dịch',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VolunteerRegisterRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Đăng ký thành công' },
        409: { description: 'Đã đăng ký trước đó' },
      },
    },
  },
  '/workforce/volunteers/me': {
    get: {
      tags: ['BE3 - Workforce & Volunteers'],
      summary: 'Tình nguyện viên xem lịch sử các đơn đăng ký của mình',
      responses: {
        200: { description: 'Danh sách đơn đăng ký cá nhân' },
      },
    },
  },
  '/workforce/volunteers/campaign/{campaignId}': {
    get: {
      tags: ['BE3 - Workforce & Volunteers'],
      summary: 'Quản trị viên/Staff xem danh sách TNV đăng ký cho 1 Campaign',
      parameters: [
        { name: 'campaignId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] } },
      ],
      responses: {
        200: { description: 'Danh sách TNV đăng ký' },
      },
    },
  },
  '/workforce/volunteers/{id}/status': {
    patch: {
      tags: ['BE3 - Workforce & Volunteers'],
      summary: 'Duyệt (APPROVED) hoặc Từ chối (REJECTED) đơn đăng ký TNV chiến dịch',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/VolunteerStatusUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
  },

  // ==========================================
  // TASK APPLICATIONS (RECRUITMENT)
  // ==========================================
  '/workforce/tasks/applications/me': {
    get: {
      tags: ['BE3 - Task Recruitment & Applications'],
      summary: 'Tình nguyện viên xem các nhiệm vụ mình đã ứng tuyển',
      responses: {
        200: { description: 'Danh sách đơn ứng tuyển cá nhân' },
      },
    },
  },
  '/workforce/tasks/{taskId}/apply': {
    post: {
      tags: ['BE3 - Task Recruitment & Applications'],
      summary: 'Tình nguyện viên nộp đơn ứng tuyển vào một nhiệm vụ đang mở tuyển (OPEN)',
      parameters: [
        { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaskApplicationRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Ứng tuyển thành công' },
        400: { description: 'Nhiệm vụ không mở tuyển hoặc đã hết hạn' },
        409: { description: 'Đã ứng tuyển hoặc đã được phân công' },
      },
    },
  },
  '/workforce/tasks/{taskId}/applications': {
    get: {
      tags: ['BE3 - Task Recruitment & Applications'],
      summary: 'Quản trị viên/Staff xem danh sách ứng tuyển cho một nhiệm vụ cụ thể',
      parameters: [
        { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] } },
      ],
      responses: {
        200: { description: 'Danh sách đơn ứng tuyển' },
      },
    },
  },
  '/workforce/tasks/applications/{id}/review': {
    patch: {
      tags: ['BE3 - Task Recruitment & Applications'],
      summary: 'Duyệt hoặc từ chối đơn ứng tuyển (Nếu duyệt sẽ tự động phân công TaskAssignment)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaskApplicationReviewRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Xét duyệt thành công' },
      },
    },
  },

  // ==========================================
  // TASKS MANAGEMENT
  // ==========================================
  '/workforce/tasks': {
    post: {
      tags: ['BE3 - Workforce & Tasks'],
      summary: 'Tạo nhiệm vụ (Task) vận hành tại trạm (Có thể liên kết Transfer & mở tuyển TNV)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaskRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo nhiệm vụ thành công' },
      },
    },
    get: {
      tags: ['BE3 - Workforce & Tasks'],
      summary: 'Lấy danh sách nhiệm vụ (Kèm bộ lọc Campaign, Station, Transfer, RecruitmentStatus)',
      parameters: [
        { name: 'campaignId', in: 'query', schema: { type: 'string' } },
        { name: 'stationId', in: 'query', schema: { type: 'string' } },
        { name: 'transferId', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] } },
        { name: 'recruitmentStatus', in: 'query', schema: { type: 'string', enum: ['NOT_OPEN', 'OPEN', 'FILLED', 'CLOSED'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: { description: 'Danh sách nhiệm vụ' },
      },
    },
  },
  '/workforce/tasks/me': {
    get: {
      tags: ['BE3 - Workforce & Tasks'],
      summary: 'Xem danh sách các nhiệm vụ được phân công cho bản thân',
      responses: {
        200: { description: 'Danh sách nhiệm vụ cá nhân' },
      },
    },
  },
  '/workforce/tasks/{id}': {
    get: {
      tags: ['BE3 - Workforce & Tasks'],
      summary: 'Chi tiết nhiệm vụ kèm danh sách người phân công & ứng tuyển',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết nhiệm vụ' },
      },
    },
    patch: {
      tags: ['BE3 - Workforce & Tasks'],
      summary: 'Cập nhật thông tin, trạng thái vận hành hoặc trạng thái tuyển TNV',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaskUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
  },
  '/workforce/tasks/assign': {
    post: {
      tags: ['BE3 - Workforce & Tasks'],
      summary: 'Phân công nhiệm vụ thủ công cho Staff hoặc Tình nguyện viên',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaskAssignRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Phân công thành công' },
      },
    },
  },
  '/workforce/tasks/check-in': {
    post: {
      tags: ['BE3 - Workforce & Attendance'],
      summary: 'Điểm danh vào ca làm việc (Check-in)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaskCheckInRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Điểm danh vào ca thành công' },
      },
    },
  },
  '/workforce/tasks/check-out': {
    post: {
      tags: ['BE3 - Workforce & Attendance'],
      summary: 'Điểm danh ra ca (Check-out) - Tính giờ làm & tự động thưởng điểm Gamification',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/TaskCheckOutRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Check-out thành công và đã nhận điểm thưởng' },
      },
    },
  },
};
