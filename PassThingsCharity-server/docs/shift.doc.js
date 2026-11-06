module.exports = {
  '/shiftstations/{stationId}/shift-templates': {
    post: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Trưởng trạm / Quản lý tạo khung ca làm việc mẫu cho trạm',
      description: 'Định nghĩa khung ca mẫu (VD: Ca Sáng 08:00 - 12:00, Ca Chiều 13:30 - 16:30) để tái sử dụng khi xếp lịch.',
      parameters: [
        {
          name: 'stationId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của trạm tiếp nhận',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'startTime', 'endTime'],
              properties: {
                name: { type: 'string', example: 'Ca Sáng', description: 'Tên ca làm việc' },
                startTime: { type: 'string', example: '08:00', description: 'Giờ bắt đầu (định dạng HH:mm)' },
                endTime: { type: 'string', example: '12:00', description: 'Giờ kết thúc (định dạng HH:mm)' },
                requiredStaff: { type: 'number', example: 2, description: 'Số lượng nhân viên tối thiểu cần cho ca' },
                description: { type: 'string', example: 'Tiếp nhận và phân loại hàng quyên góp đầu ngày' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Tạo ca làm việc mẫu thành công' },
        400: { description: 'Giờ bắt đầu phải trước giờ kết thúc hoặc dữ liệu không hợp lệ' },
        404: { description: 'Không tìm thấy trạm tiếp nhận' },
        409: { description: 'Tên ca làm này đã tồn tại ở trạm' },
      },
    },
    get: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Lấy danh sách các khung ca mẫu của trạm',
      description: 'Trả về toàn bộ các ca làm việc mẫu đang hoạt động của trạm, sắp xếp theo giờ bắt đầu.',
      parameters: [
        {
          name: 'stationId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của trạm tiếp nhận',
        },
      ],
      responses: {
        200: { description: 'Danh sách các ca mẫu của trạm' },
        400: { description: 'ID trạm không hợp lệ' },
      },
    },
  },
  '/shiftstations/{stationId}/schedules': {
    post: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Trưởng trạm phân ca làm việc cho nhân viên theo ngày',
      description: 'Gán 1 nhân viên thuộc trạm vào 1 ca mẫu trong 1 ngày cụ thể (YYYY-MM-DD). Tự động kiểm tra chống trùng lịch.',
      parameters: [
        {
          name: 'stationId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của trạm tiếp nhận',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['templateId', 'date'],
              properties: {
                templateId: { type: 'string', example: '6ae17b9d624a7e3bba8179a7', description: 'ID ca mẫu (ShiftTemplate)' },
                date: { type: 'string', example: '2026-10-29', description: 'Ngày làm việc định dạng YYYY-MM-DD' },
                staffId: { type: 'string', example: '6ad6197c1fabae084fd501e8', description: 'ID nhân viên (bỏ trống nếu là ca mở)' },
                note: { type: 'string', example: 'Trực quầy tiếp nhận đồ quyên góp' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Phân ca làm việc thành công' },
        400: { description: 'Dữ liệu không hợp lệ hoặc nhân viên không thuộc trạm' },
        404: { description: 'Không tìm thấy ca mẫu' },
        409: { description: 'Nhân viên đã được phân công ca làm này trong ngày rồi' },
      },
    },
    get: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Xem lịch phân ca của trạm',
      description: 'Lấy toàn bộ lịch phân ca của trạm, có thể lọc theo ngày hoặc theo nhân viên cụ thể.',
      parameters: [
        {
          name: 'stationId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của trạm tiếp nhận',
        },
        {
          name: 'date',
          in: 'query',
          required: false,
          schema: { type: 'string', example: '2026-10-29' },
          description: 'Lọc lịch theo ngày (YYYY-MM-DD)',
        },
        {
          name: 'staffId',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Lọc lịch theo nhân viên',
        },
      ],
      responses: {
        200: { description: 'Danh sách lịch phân ca của trạm' },
      },
    },
  },
  '/shiftstations/schedules/{id}/check-in': {
    post: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Nhân viên điểm danh vào ca làm việc (Check-in)',
      description: 'Nhân viên điểm danh khi bắt đầu ca trực. Hệ thống ghi nhận checkInTime theo giờ hiện tại và chuyển trạng thái sang IN_PROGRESS.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của lịch phân ca (ShiftSchedule)',
        },
      ],
      responses: {
        200: { description: 'Điểm danh vào ca thành công' },
        400: { description: 'Ca trực không ở trạng thái SCHEDULED để check-in' },
        403: { description: 'Bạn không được phân công ca trực này' },
        404: { description: 'Không tìm thấy ca trực' },
      },
    },
  },
  '/shiftstations/schedules/{id}/check-out': {
    post: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Nhân viên điểm danh tan ca (Check-out)',
      description: 'Nhân viên điểm danh khi kết thúc ca. Hệ thống lưu checkOutTime và chuyển trạng thái ca sang COMPLETED.',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của lịch phân ca (ShiftSchedule)',
        },
      ],
      responses: {
        200: { description: 'Điểm danh kết thúc ca thành công' },
        400: { description: 'Chưa check-in vào ca này' },
        403: { description: 'Bạn không được phân công ca trực này' },
        404: { description: 'Không tìm thấy ca trực' },
      },
    },
  },
};

