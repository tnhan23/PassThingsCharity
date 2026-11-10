# Danh sách đơn ứng tuyển theo trạm

`GET /workforce/stations/:stationId/applications`

Header: `Authorization: Bearer <token>`.

Quyền: ADMIN xem mọi trạm; STATION_MANAGER phải khớp Station.managerId; STAFF phải được phân công vào trạm qua StationStaff. Chỉ là chủ tổ chức không cấp quyền vận hành job. Trạm khác trả 403; trạm không tồn tại trả 404.

Quy tắc này dùng chung cho đăng/sửa job, xem đơn và duyệt/phân công. GET /workforce/tasks tự giới hạn danh sách của STAFF/STATION_MANAGER vào các trạm được phân công; nếu truyền stationId của trạm khác thì trả 403. GET /workforce/tasks/:id cũng chặn STAFF/STATION_MANAGER xem job của trạm khác. ADMIN được xem mọi trạm. Luồng xem job của USER/VOLUNTEER giữ nguyên.

Chỉ trả đơn của các job thuộc stationId trên URL, không lấy đơn của trạm khác.

Query tùy chọn:

- `status`: PENDING, APPROVED, REJECTED, CANCELLED. Bỏ tham số để lấy mọi trạng thái; không gửi ALL.
- `page`: mặc định 1.
- `limit`: mặc định 20, tối đa 100.

Response: `{ data: [...], total, page, totalPages }`, mới ứng tuyển trước.

Mỗi đơn có thông tin đơn, `userId` populate `_id, fullName, email, phone, username`, `reviewedBy` populate `_id, fullName, username`. `taskId` là object job, với `stationId` populate tên/địa chỉ và `campaignId` populate tiêu đề/trạng thái. Trường review chưa có dữ liệu có thể vắng mặt. API không thay đổi trạng thái đơn.

Ví dụ:

```http
GET /workforce/stations/6af1b24d08a76d2f807ea239/applications
GET /workforce/stations/6af1b24d08a76d2f807ea239/applications?status=APPROVED&page=1&limit=20
```
