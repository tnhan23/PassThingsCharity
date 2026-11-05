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
      summary: 'Trưởng trạm thêm tài khoản có sẵn làm nhân viên trạm',
      description: 'Gửi đúng một trường: userId, email, phone hoặc identifier (ID/email/SĐT). Tài khoản USER đang hoạt động được chuyển sang STAFF; tài khoản STAFF được thêm vào trạm. Không tạo tài khoản, không gửi hoặc đổi mật khẩu. Tài khoản quản lý không được chuyển role qua API này.',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              minProperties: 1,
              maxProperties: 1,
              additionalProperties: false,
              oneOf: [{ required: ['userId'] }, { required: ['email'] }, { required: ['phone'] }, { required: ['identifier'] }],
              properties: {
                userId: { type: 'string', description: 'ID tài khoản đã tồn tại.' },
                email: { type: 'string', format: 'email', example: 'staff01@gmail.com' },
                phone: { type: 'string', example: '0901234567', description: 'Số điện thoại đúng 10 chữ số' },
                identifier: { type: 'string', description: 'ID hoặc email hoặc số điện thoại của tài khoản.' },
              },
            },
            example: { email: 'staff01@gmail.com' },
          },
        },
      },
      responses: {
        201: { description: 'Đã thêm tài khoản có sẵn vào trạm, role STAFF' },
        400: { description: 'Cần gửi đúng một ID/email/SĐT hợp lệ; không nhận thông tin đăng ký tài khoản' },
        403: { description: 'Không có quyền quản lý trạm này' },
        404: { description: 'Không tìm thấy tài khoản, người dùng cần đăng ký trước' },
        409: { description: 'Đã thuộc trạm, tài khoản bị khóa, role không phù hợp hoặc số điện thoại trùng nhiều tài khoản' },
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
