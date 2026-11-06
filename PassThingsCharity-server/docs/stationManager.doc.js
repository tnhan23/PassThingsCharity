module.exports = {
  '/stationmanager/{stationId}/staff': {
    get: {
      tags: ['Station Manager'],
      summary: 'Trưởng trạm xem danh sách nhân viên trong trạm',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Danh sách nhân viên' },
      },
    },
    post: {
      tags: ['Station Manager'],
      summary: 'Trưởng trạm thêm nhân viên mới vào trạm',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'username', 'password', 'fullName', 'phone'],
              properties: {
                email: { type: 'string', format: 'email', example: 'staff01@gmail.com' },
                username: { type: 'string', example: 'staff01' },
                password: { type: 'string', format: 'password', example: '123456' },
                fullName: { type: 'string', example: 'Nguyễn Văn Staff' },
                phone: { type: 'string', example: '0901234567', description: 'Số điện thoại đúng 10 chữ số' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Tạo tài khoản STAFF và gán vào trạm thành công' },
        400: { description: 'Thông tin không hợp lệ hoặc số điện thoại không đúng 10 chữ số' },
        403: { description: 'Không có quyền quản lý trạm này' },
        409: { description: 'Email hoặc username đã tồn tại' },
      },
    },
  },
  '/stationmanager/{stationId}/staff/{staffId}': {
    patch: {
      tags: ['Station Manager'],
      summary: 'Trưởng trạm cập nhật thông tin nhân viên trong trạm',
      description: 'Cập nhật họ tên, số điện thoại, email, mật khẩu mới hoặc trạng thái (active/inactive) của nhân viên thuộc trạm.',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'staffId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              minProperties: 1,
              properties: {
                fullName: { type: 'string', example: 'Nguyễn Văn Staff Mới' },
                phone: { type: 'string', example: '0909888999', description: 'Số điện thoại đúng 10 chữ số' },
                email: { type: 'string', format: 'email', example: 'staff01_updated@gmail.com' },
                password: { type: 'string', format: 'password', example: 'newpassword123', description: 'Mật khẩu mới (tối thiểu 6 ký tự)' },
                status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thông tin nhân viên thành công' },
        400: { description: 'Dữ liệu không hợp lệ (số điện thoại không đúng 10 chữ số hoặc mật khẩu quá ngắn)' },
        403: { description: 'Không có quyền quản lý trạm này' },
        404: { description: 'Không tìm thấy nhân viên trong trạm này' },
        409: { description: 'Email mới đã được sử dụng bởi tài khoản khác' },
      },
    },
    delete: {
      tags: ['Station Manager'],
      summary: 'Trưởng trạm xóa nhân viên khỏi trạm',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'staffId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa nhân viên khỏi trạm' },
      },
    },
  },
};
