module.exports = {
  '/notifications': {
    post: {
      tags: ['Notifications (Chuông Thông Báo)'],
      summary: 'Admin phát thông báo mới (Broadcast toàn hệ thống hoặc gửi đích danh)',
      description: 'Cho phép Admin tạo thông báo gửi tới toàn bộ người dùng (targetRole: ALL), tới 1 vai trò cụ thể (VD: VOLUNTEER, STAFF), hoặc đích danh 1 tài khoản (userId).',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'content'],
              properties: {
                title: { type: 'string', example: 'Cứu trợ khẩn cấp bão số 6', description: 'Tiêu đề thông báo' },
                content: { type: 'string', example: 'Kêu gọi các trạm mở cửa tiếp nhận áo ấm và đồ dùng thiết yếu.', description: 'Nội dung chi tiết thông báo' },
                targetRole: {
                  type: 'string',
                  enum: ['ALL', 'ADMIN', 'ORG_MANAGER', 'STATION_MANAGER', 'STAFF', 'VOLUNTEER', 'USER'],
                  default: 'ALL',
                  description: 'Nhóm người nhận theo vai trò (mặc định: ALL)',
                },
                userId: { type: 'string', example: '6ad6197c1fabae084fd501e8', description: 'ID người nhận (nếu muốn gửi riêng cho 1 cá nhân, bỏ trống nếu gửi nhóm)' },
                type: {
                  type: 'string',
                  enum: ['SYSTEM', 'CAMPAIGN', 'STATION', 'ALERT'],
                  default: 'SYSTEM',
                  description: 'Loại thông báo',
                },
                metadata: {
                  type: 'object',
                  example: { campaignId: '6ad5fa91793cb88b3338723d' },
                  description: 'Dữ liệu kèm theo để app điều hướng màn hình khi bấm vào thông báo',
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Gửi thông báo thành công' },
        400: { description: 'Dữ liệu không hợp lệ hoặc thiếu tiêu đề / nội dung' },
        403: { description: 'Chỉ Admin mới có quyền phát thông báo' },
        404: { description: 'Không tìm thấy người dùng nhận thông báo (khi truyền userId)' },
      },
    },
  },
  '/notifications/me': {
    get: {
      tags: ['Notifications (Chuông Thông Báo)'],
      summary: 'Lấy danh sách thông báo và số lượng chưa đọc (Cho icon Quả chuông 🔔)',
      description: 'Trả về danh sách các thông báo dành cho user hiện tại (thông báo riêng + thông báo theo role + broadcast ALL) kèm số lượng unreadCount để hiển thị chấm đỏ trên chuông thông báo.',
      responses: {
        200: {
          description: 'Danh sách thông báo thành công',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  unreadCount: { type: 'integer', example: 3, description: 'Số lượng thông báo chưa đọc' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string', example: '6b123456789abcdef0123456' },
                        title: { type: 'string', example: 'Cứu trợ khẩn cấp bão số 6' },
                        content: { type: 'string', example: 'Kêu gọi các trạm mở cửa tiếp nhận áo ấm...' },
                        type: { type: 'string', example: 'ALERT' },
                        targetRole: { type: 'string', example: 'ALL' },
                        isRead: { type: 'boolean', example: false, description: 'Trạng thái đã đọc hay chưa' },
                        createdAt: { type: 'string', example: '2026-10-31T04:10:00.000Z' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/notifications/{id}/read': {
    patch: {
      tags: ['Notifications (Chuông Thông Báo)'],
      summary: 'Đánh dấu 1 thông báo cụ thể là đã đọc (Khi người dùng bấm vào xem)',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'ID của thông báo cần đánh dấu đã đọc',
        },
      ],
      responses: {
        200: { description: 'Đã đánh dấu thông báo là đã đọc thành công' },
        400: { description: 'ID thông báo không hợp lệ' },
        403: { description: 'Không có quyền thao tác trên thông báo này' },
        404: { description: 'Không tìm thấy thông báo' },
      },
    },
  },
  '/notifications/me/read-all': {
    patch: {
      tags: ['Notifications (Chuông Thông Báo)'],
      summary: 'Đánh dấu tất cả thông báo của bản thân là đã đọc',
      description: 'Xóa toàn bộ chấm đỏ unreadCount trên quả chuông thông báo.',
      responses: {
        200: { description: 'Đã đánh dấu tất cả thông báo là đã đọc' },
      },
    },
  },
};

