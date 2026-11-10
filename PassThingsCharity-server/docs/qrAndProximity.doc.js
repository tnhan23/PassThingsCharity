module.exports = {
  '/stations/{id}/qr': {
    get: {
      tags: ['Stations'],
      summary: 'Lấy mã QR điểm danh / xác nhận tại trạm',
      description: 'Tạo mã QR có chữ ký (PTQR:...) và mã tĩnh (STATION:<id>) cùng tọa độ trạm và bán kính cho phép đứng gần trạm (mặc định 50m / 0.05 km).',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID của trạm' },
      ],
      responses: {
        200: { description: 'Trả về mã QR và thông tin vị trí trạm' },
        404: { description: 'Không tìm thấy trạm' },
      },
    },
  },
  '/stations/{id}/verify-proximity': {
    post: {
      tags: ['Stations'],
      summary: 'Kiểm tra vị trí GPS của người dùng có đang đứng gần trạm trong bán kính 50m để mở nút check-in',
      description: 'Hỗ trợ xác thực vị trí đứng gần trạm trong bán kính tối đa 50m. Thêm query ?dryRun=true để kiểm tra trạng thái canCheckIn mà không ném lỗi 403.',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID của trạm' },
        { name: 'dryRun', in: 'query', required: false, schema: { type: 'boolean' }, description: 'Nếu true, trả về data.canCheckIn: true/false thay vì trả lỗi 403 khi đứng ngoài 50m' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['latitude', 'longitude'],
              properties: {
                latitude: { type: 'number', example: 10.7769, description: 'Vĩ độ GPS của người dùng' },
                longitude: { type: 'number', example: 106.7009, description: 'Kinh độ GPS của người dùng' },
                dryRun: { type: 'boolean', description: 'Kiểm tra trước điều kiện mở nút check-in' },
                qrCode: { type: 'string', description: 'Mã QR quét tại trạm (tùy chọn)' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đứng trong phạm vi 50m cho phép của trạm hoặc kết quả dryRun' },
        400: { description: 'Thiếu hoặc sai tọa độ GPS' },
        403: { description: 'Đứng ngoài bán kính 50m của trạm' },
      },
    },
  },
  '/shiftstations/{stationId}/qr': {
    get: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Lấy mã QR chấm công tại trạm',
      parameters: [
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Trả về mã QR của trạm phục vụ điểm danh ca trực' },
      },
    },
  },
  '/shiftstations/schedules/{id}/qr': {
    get: {
      tags: ['Shift Management (Phân ca làm việc)'],
      summary: 'Lấy mã QR chấm công của ca trực cụ thể',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID lịch phân ca (ShiftSchedule)' },
      ],
      responses: {
        200: { description: 'Trả về mã QR của ca trực' },
      },
    },
  },
  '/workforce/tasks/{id}/qr': {
    get: {
      tags: ['BE3 - Workforce & Attendance'],
      summary: 'Lấy mã QR điểm danh cho nhiệm vụ tình nguyện tại trạm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID nhiệm vụ (Task)' },
      ],
      responses: {
        200: { description: 'Trả về mã QR điểm danh nhiệm vụ tại trạm' },
      },
    },
  },
  '/transfers/{id}/shipments/{shipmentId}/qr': {
    get: {
      tags: ['BE3 - Inter-Station Transfers'],
      summary: 'Lấy mã QR bàn giao chuyến hàng theo từng bước (DISPATCH tại trạm A, REPORT/RECEIVE tại trạm B)',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID phiếu chuyển hàng' },
        { name: 'shipmentId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID chuyến hàng' },
        { name: 'stage', in: 'query', required: false, schema: { type: 'string', enum: ['DISPATCH', 'REPORT', 'RECEIVE'], default: 'REPORT' } },
      ],
      responses: {
        200: { description: 'Trả về mã QR bàn giao chuyến hàng và thông tin trạm tương ứng' },
      },
    },
  },
  '/transfers/{id}/shipments/{shipmentId}/qr-verify': {
    post: {
      tags: ['BE3 - Inter-Station Transfers'],
      summary: 'Xác thực quét mã QR và vị trí đứng gần trạm trước/khi bàn giao chuyến hàng',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'shipmentId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['qrCode', 'latitude', 'longitude'],
              properties: {
                stage: { type: 'string', enum: ['DISPATCH', 'REPORT', 'RECEIVE'], default: 'REPORT' },
                qrCode: { type: 'string', description: 'Mã QR quét được tại trạm' },
                latitude: { type: 'number', example: 10.7769 },
                longitude: { type: 'number', example: 106.7009 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Mã QR và khoảng cách tới trạm hợp lệ' },
        400: { description: 'Mã QR hoặc tọa độ GPS không hợp lệ' },
        403: { description: 'Đứng quá xa trạm hoặc mã QR không khớp' },
      },
    },
  },
};

