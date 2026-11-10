module.exports = {
  '/stations/nearby': {
    get: {
      tags: ['Stations'],
      summary: 'Đề xuất các trạm gần nhất theo tọa độ GPS (Đăng nhập vs Chưa đăng nhập)',
      description: 'API đề xuất các trạm tiếp nhận theo vị trí địa lý GPS.\n' +
        '- **Chưa đăng nhập (Guest):** Trả về danh sách trạm với tên, địa chỉ, giờ mở cửa nhưng **KHÔNG** hiển thị chi tiết khoảng cách (`distanceKm`).\n' +
        '- **Đã đăng nhập (Logged in):** Tự động tính toán khoảng cách (`distanceKm`, `distanceMeters`, `formattedDistance`) và **sắp xếp trạm gần nhất đẩy lên đầu** (từ nhỏ đến lớn).\n' +
        '- Tham số vị trí hỗ trợ linh hoạt: `latitude`/`longitude` hoặc `lat`/`lng` hoặc `userLat`/`userLng`.',
      parameters: [
        {
          name: 'latitude',
          in: 'query',
          required: false,
          schema: { type: 'number', example: 10.776889 },
          description: 'Vĩ độ vị trí hiện tại của người dùng (GPS Latitude)',
        },
        {
          name: 'longitude',
          in: 'query',
          required: false,
          schema: { type: 'number', example: 106.700806 },
          description: 'Kinh độ vị trí hiện tại của người dùng (GPS Longitude)',
        },
        {
          name: 'radius',
          in: 'query',
          required: false,
          schema: { type: 'number', example: 15 },
          description: 'Bán kính tìm kiếm tối đa (đơn vị: km)',
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', example: 10 },
          description: 'Giới hạn số lượng trạm đề xuất trả về',
        },
      ],
      responses: {
        200: {
          description: 'Danh sách các trạm đề xuất.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isLoggedIn: { type: 'boolean', example: true },
                  total: { type: 'integer', example: 5 },
                  userCoordinates: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      latitude: { type: 'number', example: 10.776889 },
                      longitude: { type: 'number', example: 106.700806 },
                    },
                  },
                  message: { type: 'string', example: 'Danh sách trạm tiếp nhận đã được sắp xếp theo khoảng cách gần nhất.' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string', example: '671000000000000000000011' },
                        name: { type: 'string', example: 'Trạm Tiếp Nhận Thiện Nguyện Quận 1' },
                        address: { type: 'string', example: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM' },
                        latitude: { type: 'string', example: '10.776889' },
                        longitude: { type: 'string', example: '106.700806' },
                        openingTime: { type: 'string', example: '08:00' },
                        closingTime: { type: 'string', example: '20:00' },
                        isActive: { type: 'boolean', example: true },
                        distanceKm: { type: 'number', example: 1.25, description: 'Chỉ xuất hiện khi ĐÃ ĐĂNG NHẬP' },
                        distanceMeters: { type: 'integer', example: 1250, description: 'Chỉ xuất hiện khi ĐÃ ĐĂNG NHẬP' },
                        formattedDistance: { type: 'string', example: '1.25 km', description: 'Chỉ xuất hiện khi ĐÃ ĐĂNG NHẬP' },
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
  '/stations': {
    get: {
      tags: ['Stations'],
      summary: 'Lấy danh sách các trạm tiếp nhận',
      responses: {
        200: {
          description: 'Danh sách trạm và tổng số trạm người dùng có quyền xem.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['total', 'data'],
                properties: {
                  total: {
                    type: 'integer',
                    minimum: 0,
                    example: 12,
                    description: 'Tổng số trạm trong danh sách sau khi lọc theo quyền truy cập.',
                  },
                  data: { type: 'array', items: { type: 'object', additionalProperties: true } },
                },
              },
            },
          },
        },
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
      description: 'Quản lý trạm được gán, chủ tổ chức có role phù hợp hoặc ADMIN được sửa. Người không phải ADMIN cập nhật sẽ đưa trạm về isActive=false để chờ duyệt lại theo quy tắc hiện tại.',
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
  '/stations/{id}/staff': {
    get: {
      tags: ['Stations'],
      summary: 'Lấy danh sách ID nhân viên được gán vào trạm (Chỉ ADMIN)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Station ID' },
      ],
      responses: {
        200: {
          description: 'Danh sách ID user được gán vào trạm.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { userId: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: 'Station ID không hợp lệ' },
        401: { description: 'Chưa đăng nhập hoặc token không hợp lệ' },
        403: { description: 'Chỉ ADMIN mới có quyền thực hiện hành động này' },
        404: { description: 'Không tìm thấy trạm' },
      },
    },
    patch: {
      tags: ['Stations'],
      summary: 'Cấp role STAFF cho User và gán vào trạm (Chỉ ADMIN)',
      description: 'Nhận email hoặc số điện thoại của tài khoản hiện có. Chỉ tài khoản role USER hoặc STAFF được xử lý; tổ chức phải được duyệt và trạm phải đang hoạt động.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' }, description: 'Station ID' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AssignStationStaffRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Đã cấp role STAFF và gán trạm thành công' },
        400: { description: 'Station ID hoặc email/số điện thoại không hợp lệ' },
        401: { description: 'Chưa đăng nhập hoặc token không hợp lệ' },
        403: { description: 'Chỉ ADMIN mới có quyền thực hiện hành động này' },
        404: { description: 'Không tìm thấy trạm, tổ chức hoặc người dùng' },
        409: { description: 'Trạm chưa được duyệt/hoạt động, user không phù hợp hoặc đã được gán' },
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
      summary: 'Gỡ Trưởng trạm khỏi trạm này; hạ role về USER nếu không còn trạm nào được gán (ADMIN, ORG_MANAGER)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '671000000000000000000011' }, description: 'Station ID' },
      ],
      responses: {
        200: { description: 'Đã gỡ Trưởng trạm; role về USER nếu không còn trạm được gán khác' },
        403: { description: 'Không có quyền quản lý trạm thuộc tổ chức này' },
        404: { description: 'Không tìm thấy trạm hoặc tổ chức' },
      },
    },
  },
};
