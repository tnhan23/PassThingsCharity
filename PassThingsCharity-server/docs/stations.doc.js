module.exports = {
  '/stations': {
    get: {
      tags: ['Stations'],
      summary: 'Lấy danh sách các trạm tiếp nhận',
      responses: {
        200: { description: 'Danh sách các trạm' },
      },
    },
    post: {
      tags: ['Stations'],
      summary: 'Tạo trạm tiếp nhận mới',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StationRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo trạm thành công' },
      },
    },
  },
  '/stations/{id}': {
    get: {
      tags: ['Stations'],
      summary: 'Xem chi tiết một trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết trạm' },
      },
    },
    patch: {
      tags: ['Stations'],
      summary: 'Cập nhật thông tin trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StationUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật trạm thành công' },
        400: { description: 'Thông tin trạm hoặc tọa độ (latitude, longitude) không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy trạm' },
      },
    },
    delete: {
      tags: ['Stations'],
      summary: 'Xóa trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa trạm' },
      },
    },
  },
  '/stations/{id}/staff/{userId}': {
    post: {
      tags: ['Stations'],
      summary: 'Gán nhân viên (role STAFF) vào trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', example: '6acbbb6a7faf5d01bb5261e4' } },
      ],
      responses: {
        200: { description: 'Gán nhân viên thành công' },
      },
    },
    delete: {
      tags: ['Stations'],
      summary: 'Xóa nhân viên khỏi trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa nhân viên khỏi trạm' },
      },
    },
  },
  '/stations/{id}/manager': {
    post: {
      tags: ['Stations'],
      summary: 'Tạo tài khoản mới và gán làm Trưởng trạm (ADMIN, ORG_MANAGER)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' }, description: 'Station ID' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateStationManagerRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Đã tạo tài khoản và gán làm Trưởng trạm thành công' },
        400: { description: 'Thông tin không hợp lệ' },
        403: { description: 'Không có quyền quản lý trạm thuộc tổ chức này' },
        404: { description: 'Không tìm thấy trạm hoặc tổ chức' },
        409: { description: 'Email hoặc username đã được sử dụng' },
      },
    },
    patch: {
      tags: ['Stations'],
      summary: 'Bổ nhiệm User có sẵn làm Trưởng trạm qua Email/SĐT (ADMIN, ORG_MANAGER)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' }, description: 'Station ID' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AssignStationManagerRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Đã bổ nhiệm làm Trưởng trạm thành công' },
        400: { description: 'Vui lòng cung cấp email hoặc số điện thoại' },
        403: { description: 'Không có quyền quản lý trạm thuộc tổ chức này' },
        404: { description: 'Không tìm thấy trạm, tổ chức hoặc người dùng' },
      },
    },
    delete: {
      tags: ['Stations'],
      summary: 'Gỡ quyền Trưởng trạm khỏi trạm này (ADMIN, ORG_MANAGER)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' }, description: 'Station ID' },
      ],
      responses: {
        200: { description: 'Đã gỡ Trưởng trạm khỏi trạm' },
        403: { description: 'Không có quyền quản lý trạm thuộc tổ chức này' },
        404: { description: 'Không tìm thấy trạm hoặc tổ chức' },
      },
    },
  },
};
