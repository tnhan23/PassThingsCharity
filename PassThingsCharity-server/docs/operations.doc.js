const accessErrorSchema = {
  type: 'object',
  required: ['code', 'message', 'error'],
  properties: {
    code: { type: 'string', description: 'Mã lỗi ổn định để FE xử lý.' },
    message: { type: 'string', description: 'Thông báo hiển thị cho người dùng.' },
    error: { type: 'string', description: 'Giống message, tương thích với FE hiện tại.' },
  },
};

// All BE3 endpoints require authentication. Document JSON failures consistently.
const accessResponses = {
  401: {
    description: 'Request thiếu Bearer token, sai định dạng Authorization, token hết hạn/không hợp lệ hoặc tài khoản không hoạt động. Thiếu token không đồng nghĩa người dùng chưa đăng nhập trên FE.',
    content: { 'application/json': {
      schema: accessErrorSchema,
      example: { code: 'AUTH_TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
    } },
  },
  403: {
    description: 'Đã đăng nhập nhưng không có quyền thực hiện hành động.',
    content: { 'application/json': {
      schema: accessErrorSchema,
      example: { code: 'FORBIDDEN', message: 'Bạn không có quyền truy cập.', error: 'Bạn không có quyền truy cập.' },
    } },
  },
};

const paths = {
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
      summary: 'Xem chi tiết lệnh điều phối, người vận chuyển và phân bổ từng mặt hàng',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết phiếu gồm danh sách shipment; mỗi shipment có carrierId và số lượng giao cho tài xế theo từng transferItemId. Đơn vị (ví dụ KG) nằm trong items của phiếu.' },
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
      summary: 'User nộp đơn ứng tuyển vào job đang mở tuyển',
      description: 'USER applies for a future open schedule; approval is required. Duplicate, full, expired and overlapping assigned schedules are rejected.',
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
      description: 'Station operators approve pending applications. Capacity and overlapping assignments are checked in a MongoDB transaction. Approval creates an assignment; the last place closes recruitment.',
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
      description: 'Create a station work schedule. campaignId is optional. startTime/endTime and a positive requiredVolunteers capacity are required. Recruitment defaults to OPEN. Use timestamps with timezone, e.g. +07:00.',
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
      description: 'Changing times or capacity after participants are assigned is rejected.',
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
      summary: 'User check-out công việc; server tự tính giờ và cộng điểm thưởng một lần',
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
        409: { description: 'Chưa check-in hoặc công việc đã ở trạng thái không thể check-out' },
      },
    },
  },
  '/workforce/tasks/assignments/{assignmentId}/absent': {
    patch: {
      tags: ['BE3 - Workforce & Attendance'],
      summary: 'Quản lý xác nhận người được phân công vắng mặt và mở lại slot tuyển',
      parameters: [{ name: 'assignmentId', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskAbsenceRequest' } } },
      },
      responses: {
        200: { description: 'Lần đầu cảnh cáo; từ lần vắng mặt thứ hai trừ tối đa 10 điểm theo số dư hiện có; mở lại slot nếu còn thiếu người' },
        400: { description: 'ID phân công không hợp lệ' },
        403: { description: 'Chỉ quản lý, nhân viên hoặc admin được xác nhận' },
        404: { description: 'Không tìm thấy phân công/công việc' },
        409: { description: 'Chưa hết thời gian công việc hoặc đã check-in/hoàn thành' },
      },
    },
  },
};

// Mirror checkRole in routes; null means any successfully authenticated account.
Object.assign(paths, require('./transferHandover.doc'));
paths['/transfers'].post.description = 'STAFF or source station manager creates the transfer. responsibleUserId defaults to its creator; receivedBy starts null. STAFF needs a current shift when creating or being assigned responsibility. After approval, station B manager is notified and sets receivedBy using /responsibilities. Dispatch requires an assigned receiver. Uploading or creating a transfer does not change physical stock.';
paths['/transfers/{id}/status'].patch.description = 'Phi?u m?i ch? d?ng endpoint n?y ?? CANCELLED tr??c khi xu?t ho?c COMPLETED sau khi nh?n ??. Kh?ng ???c ??i th?ng PREPARING/IN_TRANSIT/RECEIVED; d?ng API duy?t v? b?n giao t?ng ng??i.';

const operators = ['ADMIN', 'STATION_MANAGER', 'STAFF'];
const managers = ['ADMIN', 'STATION_MANAGER'];
const permissions = {
  'GET /transfers/shipments/me': null,
  'PATCH /transfers/{id}/approval': managers,
  'PATCH /transfers/{id}/responsibilities': managers,
  'POST /transfers/{id}/shipments': operators,
  'DELETE /transfers/{id}/shipments/{shipmentId}': operators,
  'POST /transfers/{id}/shipments/{shipmentId}/evidence/{stage}': ['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER'],
  'POST /transfers/{id}/shipments/{shipmentId}/dispatch': operators,
  'POST /transfers/{id}/shipments/{shipmentId}/report': ['USER', 'STAFF', 'STATION_MANAGER', 'ADMIN'],
  'POST /transfers/{id}/shipments/{shipmentId}/receive': operators,
  'POST /contributions/upload-images': operators,
  'GET /contributions/lookup': operators,
  'POST /contributions': operators,
  'GET /contributions': null,
  'GET /contributions/{id}': null,
  'PATCH /contributions/{id}/status': managers,
  'POST /contributions/{id}/images': operators,
  'POST /transfers': ['STATION_MANAGER', 'STAFF'],
  'GET /transfers': operators,
  'GET /transfers/{id}': ['ADMIN', 'STATION_MANAGER', 'STAFF', 'USER'],
  'PATCH /transfers/{id}/status': operators,
  'POST /relief': operators,
  'GET /relief': null,
  'GET /relief/{id}': null,
  'PATCH /relief/{id}/status': operators,
  'GET /relief/summary/{campaignId}': null,
  'POST /workforce/volunteers/register': null,
  'GET /workforce/volunteers/me': null,
  'GET /workforce/volunteers/campaign/{campaignId}': operators,
  'PATCH /workforce/volunteers/{id}/status': managers,
  'GET /workforce/tasks/applications/me': null,
  'POST /workforce/tasks/{taskId}/apply': null,
  'GET /workforce/tasks/{taskId}/applications': operators,
  'PATCH /workforce/tasks/applications/{id}/review': operators,
  'POST /workforce/tasks': operators,
  'GET /workforce/tasks': null,
  'GET /workforce/tasks/me': null,
  'GET /workforce/tasks/{id}': null,
  'PATCH /workforce/tasks/{id}': operators,
  'POST /workforce/tasks/assign': operators,
  'POST /workforce/tasks/check-in': null,
  'POST /workforce/tasks/check-out': null,
  'PATCH /workforce/tasks/assignments/{assignmentId}/absent': operators,
};

const personalScopes = {
  'PATCH /transfers/{id}/responsibilities': 'Station A manager assigns responsibleUserId; station B manager assigns receivedBy; ADMIN may assign either. STAFF duty is checked at assignment, not on every later handover.',
  'POST /transfers': 'STAFF ho?c tr??ng tr?m ngu?n t?o phi?u ch? duy?t; ADMIN ch? duy?t, kh?ng t?o.',
  'GET /transfers': 'Ch? xem phi?u li?n quan tr?m ???c qu?n l?/ph?n c?ng; ADMIN xem t?t c?.',
  'GET /transfers/{id}': 'Nh?n s? tr?m ngu?n/??ch ho?c ADMIN xem phi?u. USER ch? xem khi c? ph?n ch? trong phi?u v? ch? nh?n ph?n ch? c?a m?nh.',
  'PATCH /transfers/{id}/approval': 'Ch? tr??ng tr?m ngu?n ???c g?n ho?c ADMIN duy?t; ch?a xu?t kho.',
  'PATCH /transfers/{id}/status': 'Phi?u m?i d?ng API duy?t, xu?t v? nh?n t?ng ng??i. API n?y ch? h?y khi ch?a xu?t ho?c ho?n t?t khi ?? nh?n ??. Kh?ng ???c nh?y th?ng IN_TRANSIT/RECEIVED.',
  'DELETE /transfers/{id}/shipments/{shipmentId}': 'Only source station staff/manager or ADMIN; remove an allocation before any dispatch.',
  'POST /transfers/{id}/shipments': 'Nh?n s? tr?m ngu?n ho?c ADMIN ph?n h?ng cho ng??i c? nhi?m v? ???c duy?t.',
  'GET /transfers/shipments/me': 'Ch? ph?n h?ng t?i kho?n trong token ???c giao ch?.',
  'POST /transfers/{id}/shipments/{shipmentId}/evidence/{stage}': 'DISPATCH thu?c nh?n s? tr?m A; REPORT ch? ng??i ch?; RECEIVE thu?c nh?n s? tr?m B. ADMIN ???c x?c nh?n xu?t/nh?n.',
  'POST /transfers/{id}/shipments/{shipmentId}/dispatch': 'Nh?n s? tr?m A ho?c ADMIN, sau duy?t v? ph?n ?? h?ng.',
  'POST /transfers/{id}/shipments/{shipmentId}/report': 'Ch? ng??i ???c giao ch?, kh?ng x?c nh?n thay b?ng quy?n qu?n l?.',
  'POST /transfers/{id}/shipments/{shipmentId}/receive': 'Nh?n s? tr?m B ho?c ADMIN x?c nh?n th?c nh?n.',
  'POST /workforce/volunteers/register': 'Đăng ký cho chính tài khoản trong token; userId do BE lấy từ token.',
  'GET /workforce/volunteers/me': 'Chỉ trả đơn đăng ký của tài khoản trong token.',
  'GET /workforce/tasks/applications/me': 'Chỉ trả đơn ứng tuyển của tài khoản trong token.',
  'POST /workforce/tasks/{taskId}/apply': 'Ứng tuyển cho chính tài khoản trong token; userId do BE lấy từ token.',
  'GET /workforce/tasks/me': 'Chỉ trả nhiệm vụ được phân công cho tài khoản trong token.',
  'POST /workforce/tasks/check-in': 'Người được phân công tự check-in; ADMIN, STATION_MANAGER hoặc STAFF được check-in thay người khác. Tài khoản khác nhận 403.',
  'POST /workforce/tasks/check-out': 'Người được phân công tự check-out; ADMIN, STATION_MANAGER hoặc STAFF được check-out thay người khác. Tài khoản khác nhận 403.',
  'PATCH /workforce/tasks/assignments/{assignmentId}/absent': 'Chỉ ADMIN, STATION_MANAGER hoặc STAFF xác nhận vắng mặt; lần đầu cảnh cáo, từ lần thứ hai trừ tối đa 10 điểm mỗi lần, không để số dư âm; mở lại slot tuyển khi phù hợp.',
};

for (const [url, path] of Object.entries(paths)) {
  for (const [method, operation] of Object.entries(path)) {
    const key = `${method.toUpperCase()} ${url}`;
    if (!Object.prototype.hasOwnProperty.call(permissions, key)) {
      throw new Error(`Missing BE3 Swagger permission: ${key}`);
    }
    const roles = permissions[key];
    const label = roles ? roles.join(' / ') : 'Mọi role có token hợp lệ';
    operation.summary = `[${label}] ${operation.summary}`;
    const scope = personalScopes[key] || (roles
      ? 'Kiểm tra role theo danh sách trên; hiện chưa giới hạn dữ liệu theo trạm/tổ chức của tài khoản.'
      : 'Hiện BE không giới hạn role và không tự giới hạn dữ liệu theo người dùng/trạm/tổ chức; kết quả phụ thuộc bộ lọc của API.');
    operation.description = `**Quyền truy cập:** ${label}.\n\n**Phạm vi:** ${scope}${operation.description ? `\n\n${operation.description}` : ''}`;
    operation.security = [{ bearerAuth: [] }];
    operation['x-allowed-roles'] = roles || ['*'];
    operation.responses = { ...operation.responses, ...accessResponses };
  }
}

// Slot totals are computed from assignments and applications, never maintained by FE.
const scheduleWithSlots = {
  type: 'object', additionalProperties: true,
  properties: { _id: { type: 'string' }, recruitmentStatus: { type: 'string' }, slots: { $ref: '#/components/schemas/TaskSlots' } },
};
for (const [url, method, code, shape] of [
  ['/workforce/tasks', 'post', 201, 'single'],
  ['/workforce/tasks', 'get', 200, 'list'],
  ['/workforce/tasks/{id}', 'get', 200, 'single'],
  ['/workforce/tasks/{id}', 'patch', 200, 'single'],
  ['/workforce/tasks/{taskId}/apply', 'post', 201, 'single'],
  ['/workforce/tasks/{taskId}/applications', 'get', 200, 'single'],
  ['/workforce/tasks/applications/{id}/review', 'patch', 200, 'single'],
  ['/workforce/tasks/assign', 'post', 201, 'single'],
  ['/workforce/tasks/me', 'get', 200, 'assignments'],
]) {
  const op = paths[url][method];
  op.description += '\n\nResponse includes task.slots (total, approved, pending, remaining, isFull). List responses include slots on each task; /tasks/me includes them in data[].taskId.slots. Pending applications do not use a place. FE should refresh the list/detail after apply or review; no realtime push is provided.';
  const properties = shape === 'list'
    ? { data: { type: 'array', items: scheduleWithSlots } }
    : shape === 'assignments'
      ? { data: { type: 'array', items: { type: 'object', properties: { taskId: scheduleWithSlots } } } }
      : { task: scheduleWithSlots };
  op.responses[code] = { ...op.responses[code], content: { 'application/json': { schema: { type: 'object', additionalProperties: true, properties } } } };
}
module.exports = paths;
