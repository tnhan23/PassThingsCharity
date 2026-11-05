module.exports = {
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

const schedulesPath = '/shiftstations/{stationId}/schedules';
module.exports[schedulesPath].post.description = 'Tạo một lịch, chỉ STATION_MANAGER/ORG_MANAGER có quyền quản lý trạm. Ngày phải tồn tại, thời điểm bắt đầu phải trong tương lai theo UTC+7. Chặn nhân viên trùng giờ kể cả khác ca mẫu/trạm; cho phép hai ca nối tiếp. Cần MongoDB replica set hoặc Atlas cho transaction.';
module.exports[schedulesPath].get.parameters.push(
  { name: 'fromDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Ngày đầu khoảng (bao gồm). Phải gửi cùng toDate, không dùng cùng date.' },
  { name: 'toDate', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Ngày cuối khoảng (bao gồm).' }
);
module.exports['/shiftstations/{stationId}/schedules/batch'] = {
  post: {
    tags: ['Shift Management (Phân ca làm việc)'],
    summary: 'Tạo nhiều lịch, ví dụ lịch cả tuần, trong một transaction',
    description: 'Quyền và kiểm tra như tạo lịch đơn. Tối đa 100 lịch/request. Nếu bất kỳ lịch nào sai hoặc trùng giờ thì không lưu lịch nào trong request. Mỗi phần tử là một ngày, một ca mẫu, một nhân viên; staffId có thể bỏ trống cho ca chưa phân người.',
    parameters: module.exports[schedulesPath].post.parameters,
    requestBody: { required: true, content: { 'application/json': { schema: {
      type: 'object', required: ['schedules'], properties: { schedules: {
        type: 'array', minItems: 1, maxItems: 100,
        items: module.exports[schedulesPath].post.requestBody.content['application/json'].schema,
      } },
    } } } },
    responses: { ...module.exports[schedulesPath].post.responses, 403: { description: 'Không được quản lý trạm.' } },
  },
};
module.exports['/shiftstations/schedules/{id}/check-in'].post.description = 'Chỉ nhân viên được phân công, còn thuộc trạm và lịch SCHEDULED được check-in. Mặc định bỏ kiểm tra giờ để test ngay. Khi SHIFT_ENFORCE_CHECKIN_TIME=true, chỉ cho check-in từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc ca theo UTC+7; ngoài khoảng trả 409. Check-out sau check-in không bị giới hạn giờ. Tạo lịch quá khứ vẫn bị chặn.';

module.exports['/shiftstations/shift-templates'] = { get: {
  tags: ['Shift Management (Phân ca làm việc)'], summary: 'Danh mục ca chung: sáng 08:00–14:00, chiều 14:00–20:00',
  description: 'Cần đăng nhập ADMIN/STATION_MANAGER/ORG_MANAGER/STAFF. Tự khởi tạo khi server chạy; không cần stationId. Response {data:[{_id,name,startTime,endTime,description}]}. Giờ UTC+7.',
  responses: { 200: { description: 'Danh mục ca dùng chung' }, 401: { description: 'Chưa đăng nhập' }, 403: { description: 'Không có quyền' } },
} };
const scheduleSchema = module.exports[schedulesPath].post.requestBody.content['application/json'].schema;
scheduleSchema.required = ['templateId', 'date'];
scheduleSchema.example = {
  templateId: '6ae17b9d624a7e3bba8179a7',
  date: '2099-11-06',
  staffIds: ['6ad6197c1fabae084fd501e8'],
  requiredStaff: 1,
  description: 'Trực quầy tiếp nhận đồ quyên góp',
};
Object.assign(scheduleSchema.properties, {
  staffIds: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string' }, description: 'Dùng staffIds hoặc staffId. Mỗi người tạo một lịch; data là mảng khi gửi staffIds.' },
  requiredStaff: { type: 'integer', minimum: 1, description: 'Nhu cầu nhân sự của lần phân lịch, ít nhất bằng số staffIds. Không phải bộ đếm chỗ trống toàn ca.' },
  description: { type: 'string', description: 'Ghi chú, lưu vào note. assignedBy tự lấy từ token.' },
});
module.exports[schedulesPath].post.description += ' Chỉ nhận templateId lấy từ _id của danh mục ca. Nhận staffIds để phân nhiều người (data mảng) hoặc staffId cho một người (data object). Tối đa 100 phân công sau khi tách danh sách. Không gửi đồng thời staffId và staffIds.';
module.exports[schedulesPath].get.description = 'Response danh sách phẳng {data:[{_id,date,stationId,templateId,staffId,status,checkInTime,checkOutTime,requiredStaff,note,assignedBy,createdAt,updatedAt}]}. Mỗi dòng là một phân công của một nhân viên; templateId và staffId được populate. Dùng _id của dòng để check-in/check-out. Sắp theo ngày, ID ca và ID nhân viên. FE hiển thị bảng ngày/ca/nhân viên/trạng thái/giờ vào/giờ ra. Không gom nhóm hoặc thêm groupKey. POST giữ response như trước.';

