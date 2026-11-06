# Luồng dữ liệu Pass Đồ

Server trong `PassThingsCharity-server` giữ luồng nghiệp vụ. App ở `PassThingsCharity-mobile` gọi API đó. `app.json` trỏ host công khai `https://passthingscharity-api.onrender.com`. Đặt `EXPO_PUBLIC_API_URL` khi cần máy chủ khác. Lời gọi tới host công khai được ký bằng `EXPO_PUBLIC_APP_SIGNING_SECRET` lúc build. Chi tiết cho AI đọc nằm trong `AGENTS.md`.

Thư mục `PassThingsCharity-mobile/ios` không nằm trên nhánh này. Dự án Xcode để cài máy nằm trên nhánh `ios`.

Người dùng và khách xem Khám phá, Tặng đồ, Trạm gom, Hồ sơ. Nhân viên, trưởng trạm, quản lý tổ chức và admin mở app vào việc của vai đó. Quản lý tổ chức có thêm chế độ Đóng góp để vẫn mang đồ tới trạm như người dùng.

```mermaid
flowchart TD
  mo[Mở app] --> vai{Vai trò từ GET /users/me/profile}
  vai --> user[Người dùng: chiến dịch và trạm]
  vai --> quay[Nhân viên và trưởng trạm: phiếu và ca]
  vai --> quan[Quản lý tổ chức và admin: bảng việc]
  user --> ds["GET /campaigns"]
  ds --> ct["GET /campaigns/id và trạm của chiến dịch"]
  user --> phieu["GET /contributions?userId= của chính mình"]
```

Đăng ký là `POST /auth/register` rồi login. Sửa hồ sơ, đổi mật khẩu, xóa tài khoản nằm ở `/account`.

```mermaid
flowchart TD
  nop["USER POST /organizations"] --> duyet["ADMIN PATCH /admin/organizations/id/approve"]
  duyet --> ql[Người nộp trở thành quản lý tổ chức]
  ql --> tram["POST /organizations/id/stations, trạm chưa mở"]
  tram --> mo["ADMIN PATCH /admin/stations/id/approve"]
  mo --> gan["Quản lý tổ chức gán trưởng trạm"]
  quay2["STAFF hoặc STATION_MANAGER POST /contributions"] --> diem[Server ghi phiếu đã tiếp nhận và cộng điểm]
  admin["ADMIN GET /users"] --> khoa["PATCH /users/id/status active hoặc banned"]
  thong["ADMIN POST /notifications"] --> chuong[Chuông của mọi người hoặc của nhân viên]
```

Chiến dịch `ACTIVE` hiện là đang nhận đồ. `PUBLISHED` trước ngày bắt đầu là sắp mở. Admin không lập phiếu tiếp nhận và không tạo tổ chức hay trạm trên app. Người dùng nộp đơn tổ chức. Quản lý tổ chức tạo trạm. Admin duyệt.
