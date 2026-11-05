# Hướng dẫn FE: ca dùng chung và phân lịch nhân viên

## Chế độ điểm danh hiện tại

Mặc định `SHIFT_ENFORCE_CHECKIN_TIME` chưa đặt hoặc bằng `false`: cho check-in ngay dù chưa tới ngày/giờ ca để FE test, sau đó check-out ngay được. Vẫn cần đúng nhân viên, còn thuộc trạm và đúng trạng thái (SCHEDULED → IN_PROGRESS → COMPLETED). Không cần chờ giờ bắt đầu trong các ví dụ test bên dưới khi chế độ kiểm tra đang tắt.

Sau này bật ràng buộc bằng `.env`: `SHIFT_ENFORCE_CHECKIN_TIME=true`, rồi khởi động lại backend. Khi bật, check-in được từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc ca, theo UTC+7. Ví dụ ca 08:00–14:00 được check-in từ 07:45 đến trước 14:00. Check-out không giới hạn giờ, nhưng phải check-in trước. Quy tắc cấm tạo lịch quá khứ vẫn giữ nguyên ở cả hai chế độ.

Giờ làm theo Việt Nam (UTC+7). Danh mục được tự tạo khi backend khởi động sau khi kết nối MongoDB; không cần FE tạo mẫu hay chạy seed. Khởi động lại backend sau khi cập nhật code.

## 1. Lấy danh mục ca

`GET /shiftstations/shift-templates`, header `Authorization: Bearer <token>`.
Role: ADMIN, STATION_MANAGER, ORG_MANAGER, STAFF.

Response `{ "data": [...] }`, mỗi phần tử có `_id`, `name`, `startTime`, `endTime`, `description`:

| name | startTime | endTime |
|---|---|---|
| Ca sáng | 08:00 | 14:00 |
| Ca chiều | 14:00 | 20:00 |

Danh mục dùng chung, không cần stationId. Chỉ dùng `GET /shiftstations/shift-templates` để lấy ca mẫu; không còn API tạo/lấy ca mẫu riêng theo trạm. Mẫu riêng cũ và tham chiếu trong lịch cũ được giữ nguyên.

## 2. Phân một ca cho nhiều người

`POST /shiftstations/:stationId/schedules`, token STATION_MANAGER hoặc ORG_MANAGER có quyền quản lý trạm.

```json
{
  "templateId": "<ID ca sáng>",
  "date": "2099-11-06",
  "requiredStaff": 2,
  "staffIds": ["<ID tài khoản nhân viên A>", "<ID tài khoản nhân viên B>"],
  "description": "Trực nhận đồ"
}
```

Đổi ngày ví dụ thành ngày thực tế trong tương lai. stationId nằm ở URL, không gửi trong body. templateId: _id trong API danh mục ca. date bắt buộc YYYY-MM-DD. requiredStaff là số nguyên dương; nếu bỏ trống mặc định bằng số staffIds (hoặc 1 nếu không có staffIds). description tùy chọn. Mỗi nhân viên phải thuộc trạm. staffIds không rỗng, không trùng, không vượt requiredStaff trong request này. requiredStaff là nhu cầu nhân sự ghi nhận trên từng phân công, không phải bộ đếm chỗ trống toàn ca.

Backend tự lưu assignedBy từ token, không gửi createdBy/assignedBy. Không gửi giờ bắt đầu/kết thúc: backend tra từ templateId. Mỗi nhân viên tạo một ShiftSchedule riêng để điểm danh.

Response 201 `{ message, data: [<lịch A>, <lịch B>] }` khi gửi staffIds. Lịch trả về có templateId tham chiếu ca, staffId, requiredStaff, date và assignedBy; description được lưu vào note.

Tương thích cũ: có thể dùng staffId thay staffIds (response data là một object). Không gửi đồng thời staffId/staffIds. Bỏ cả staffId/staffIds sẽ tạo một lịch chưa phân người.

## 3. Tạo lịch tuần

`POST /shiftstations/:stationId/schedules/batch`

```json
{
  "schedules": [
    { "templateId": "<ID ca sáng>", "date": "2099-11-06", "requiredStaff": 2, "staffIds": ["<ID A>", "<ID B>"], "description": "Ca sáng" },
    { "templateId": "<ID ca chiều>", "date": "2099-11-07", "staffId": "<ID A>" }
  ]
}
```

FE thêm từng ngày/ca cần phân vào schedules. Tối đa 100 phân công sau khi tách staffIds. Response data luôn là mảng. Nếu một lịch lỗi, toàn bộ request không được lưu. MongoDB cần replica set/Atlas.

## 4. Xem lịch và điểm danh

- `GET /shiftstations/:stationId/schedules?fromDate=2099-11-06&toDate=2099-11-12` (bao gồm cả hai ngày).
- Có thể thêm `staffId=<ID tài khoản>`; hoặc dùng date thay khoảng ngày.
- GET lịch trả `data` là danh sách phẳng: mỗi phần tử là một phân công của một nhân viên. Không có groupKey hoặc assignments lồng bên trong.
- Thứ tự trường: `_id`, `date`, `stationId`, `templateId` (chi tiết ca), `staffId` (thông tin nhân viên), `status`, `checkInTime`, `checkOutTime`, `requiredStaff`, `note`, `assignedBy`, `createdAt`, `updatedAt`.
- Dùng `_id` của từng dòng để check-in/check-out, không dùng `staffId._id` hoặc `templateId._id`. Danh sách sắp theo ngày, ID ca, ID nhân viên và ID phân công.
- FE hiển thị bảng: Ngày | Ca (tên + giờ) | Nhân viên | Trạng thái | Giờ vào | Giờ ra. null hiển thị “Chưa vào ca”/“Chưa tan ca”; thời gian hiển thị theo UTC+7. Chi tiết người phân công, nhu cầu nhân sự và ghi chú có thể đặt trong phần xem chi tiết.
- `POST /shiftstations/schedules/:id/check-in`, không cần body; id là ID lịch phân công, token STAFF được giao.
- `POST /shiftstations/schedules/:id/check-out`, không cần body.

Chỉ tạo lịch có giờ bắt đầu trong tương lai. Không cho ngày không tồn tại. Không cho nhân viên trùng giờ dù khác trạm/mẫu; ca kết thúc 14:00 và ca bắt đầu 14:00 không trùng. Check-in theo cấu hình ở mục “Chế độ điểm danh hiện tại”. Check-out sau khi đã check-in, có thể thực hiện ngay hoặc sau giờ kết thúc ca.

FE xử lý 400 (body/ngày sai hoặc lịch quá khứ), 401 (token), 403 (không có quyền trạm), 404 (mẫu/nhân viên/lịch không tìm thấy theo nghiệp vụ), 409 (trùng ca/trạng thái hoặc giờ điểm danh không hợp lệ).
