# 📖 TÀI LIỆU HƯỚNG DẪN 5 LUỒNG NGHIỆP VỤ & TEST POSTMAN
### Hệ thống Quản trị Quyên góp Thiện nguyện PassThingsCharity

---

## 🏛️ TỔNG QUAN VỀ HỆ THỐNG PHÂN QUYỀN (6 ROLES)

| Role | Tên vai trò | Thẩm quyền chính |
| :--- | :--- | :--- |
| **`ADMIN`** | Quản trị viên hệ thống | Quản trị toàn hệ thống, phê duyệt / từ chối tổ chức từ thiện, kích hoạt trạm tiếp nhận. |
| **`ORG_MANAGER`** | Quản lý tổ chức | Quản lý tổ chức của mình, tạo các trạm trực thuộc, bổ nhiệm / miễn nhiệm Trưởng trạm, khởi tạo chiến dịch cứu trợ. |
| **`STATION_MANAGER`**| Trưởng trạm | Quản lý trực tiếp một hoặc nhiều trạm được giao; tạo tài khoản Staff; duyệt TNV và phân chia nhiệm vụ tại trạm. |
| **`STAFF`** | Nhân viên trạm | Kiểm kê, phân loại đồ quyên góp, xuất kho cứu trợ, hỗ trợ điểm danh TNV. |
| **`VOLUNTEER`** | Tình nguyện viên | Đăng ký tham gia chiến dịch, ứng tuyển nhiệm vụ tại trạm, check-in / check-out hoàn thành task. |
| **`USER`** | Người dùng đại chúng | Đăng ký tài khoản, gửi vật phẩm quyên góp, đăng ký tình nguyện, **gửi đơn đề nghị thành lập tổ chức**. |

---

## 🚀 CHI TIẾT 5 LUỒNG NGHIỆP VỤ & KỊCH BẢN TEST POSTMAN

> **Base URL:** `http://localhost:8080` (hoặc `http://localhost:8081` tùy cổng server của bạn).

---

### 🟢 LUỒNG 1: ĐĂNG KÝ & ĐĂNG NHẬP TÀI KHOẢN NGƯỜI DÙNG (`USER`)

Mọi người dùng khi mới tải ứng dụng đều bắt đầu bằng vai trò `USER` thông thường.

#### 1.1. Đăng ký tài khoản mới (`POST /auth/register`)
* **URL:** `POST http://localhost:8080/auth/register`
* **Headers:** `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "email": "user01@gmail.com",
  "username": "user01",
  "password": "Password123!",
  "fullname": "Nguyễn Văn A",
  "phone": "0987654321"
}
```
* **Kết quả:** Trả về `201 Created`, tài khoản được tạo với `role: "USER"`, `status: "active"`.

#### 1.2. Đăng nhập hệ thống (`POST /auth/login`)
* **URL:** `POST http://localhost:8080/auth/login`
* **Body (raw JSON):**
```json
{
  "username": "user01",
  "password": "Password123!"
}
```
* **Kết quả:** Trả về mã JWT Bearer `token`. 
* 👉 **Lưu lại token này để gọi các API tiếp theo:** `USER_TOKEN`.

#### 1.3. Cập nhật hồ sơ cá nhân (`PATCH /users/me/profile`)
* **URL:** `PATCH http://localhost:8080/users/me/profile`
* **Headers:** `Authorization: Bearer <USER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "fullName": "Nguyễn Văn A (Cập nhật)",
  "phone": "0987654322"
}
```

#### 1.4. Đổi mật khẩu chủ động (`PATCH /auth/change-password`)
*(Dành cho người dùng đã đăng nhập, muốn đổi sang mật khẩu mới)*
* **URL:** `PATCH http://localhost:8080/auth/change-password`
* **Headers:** `Authorization: Bearer <USER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

#### 1.5. LUỒNG QUÊN MẬT KHẨU (FORGOT PASSWORD QUA EMAIL & OTP)
*(Dành cho người dùng bị quên mật khẩu, không thể đăng nhập)*

##### 🔹 Bước 1: Gửi yêu cầu nhận mã OTP qua Email (`POST /auth/forgot-password`)
* **URL:** `POST http://localhost:8080/auth/forgot-password`
* **Body (raw JSON):**
```json
{
  "email": "user01@gmail.com"
}
```
* **Kết quả:** Trả về `200 OK` với thông báo: `"Nếu email tồn tại, mã xác nhận đã được gửi."`.
* 📧 Hệ thống sẽ gửi một mã OTP gồm **6 chữ số** về email của bạn (mã có hiệu lực trong **10 phút**).
* 👉 Mở hòm thư email (hoặc xem log terminal của server) để lấy mã `OTP`.

##### 🔹 Bước 2: Nhập OTP và đặt lại mật khẩu mới (`POST /auth/reset-password`)
* **URL:** `POST http://localhost:8080/auth/reset-password`
* **Body (raw JSON):**
```json
{
  "email": "user01@gmail.com",
  "otp": "123456",
  "newPassword": "MyNewPassword789!"
}
```
* **Kết quả:** Trả về `200 OK` với thông báo: `"Đặt lại mật khẩu thành công."`.
* 👉 Giờ bạn có thể dùng mật khẩu mới này để đăng nhập lại tại `POST /auth/login`.

#### 1.6. Xóa vĩnh viễn tài khoản của chính mình (`DELETE /users/:id`)
* **URL:** `DELETE http://localhost:8080/users/<USER_ID>`
* **Headers:** `Authorization: Bearer <USER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "password": "Password123!"
}
```

---

### 🟢 LUỒNG 2: USER GỬI YÊU CẦU THÀNH LẬP TỔ CHỨC & ADMIN PHÊ DUYỆT

Người dùng có mong muốn làm thiện nguyện sẽ gửi hồ sơ đề nghị thành lập tổ chức. Admin thẩm định và duyệt.

#### 2.1. USER gửi đơn đăng ký thành lập tổ chức (`POST /organizations`)
* **URL:** `POST http://localhost:8080/organizations`
* **Headers:** `Authorization: Bearer <USER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "name": "Tổ Chức Cứu Trợ Thiện Nguyện Ánh Dương",
  "code": "ANHDUONG2026",
  "address": "123 Đường Lê Lợi, Bến Nghé, Quận 1, TP.HCM",
  "phone": "0912345678",
  "email": "contact@anhduongcharity.org",
  "description": "Chuyên cứu trợ đồng bào lũ lụt Miền Trung và hỗ trợ quần áo ấm cho trẻ em nghèo",
  "operatingArea": "TP.HCM và các tỉnh Duyên hải Miền Trung",
  "idCardNumber": "079123456789"
}
```
* **Kết quả:** Trả về `201 Created` với `status: "PENDING"`, `isVerified: false`.
* 👉 **Copy `_id` của tổ chức** vừa tạo: `ORG_ID`.
* *(Thử bấm Send thêm lần nữa sẽ nhận lỗi `400: Bạn đã có một yêu cầu thành lập tổ chức đang chờ duyệt` - Tính năng chống spam).*

#### 2.2. Admin đăng nhập để lấy quyền Quản trị tối cao
* **URL:** `POST http://localhost:8080/auth/login`
* **Body (raw JSON):**
```json
{
  "username": "admin_system",
  "password": "Password123!"
}
```
*(Nếu database chạy từ seed.js thì mật khẩu là `123456`)*.
* 👉 **Lưu lại token Admin:** `ADMIN_TOKEN`.

#### 2.3. Admin duyệt tổ chức & Tự động nâng Role (`PATCH /admin/organizations/:id/approve`)
* **URL:** `PATCH http://localhost:8080/admin/organizations/<ORG_ID>/approve`
* **Headers:** `Authorization: Bearer <ADMIN_TOKEN>`
* **Kết quả:** 
  * Tổ chức chuyển sang `status: "APPROVED"`, `isVerified: true`.
  * **Hệ thống tự động nâng role của `user01` thành `ORG_MANAGER`**!

#### 2.4. (Tùy chọn) Admin từ chối nếu hồ sơ không hợp lệ
* **URL:** `PATCH http://localhost:8080/admin/organizations/<ORG_ID>/reject`
* **Headers:** `Authorization: Bearer <ADMIN_TOKEN>`
* **Body (raw JSON):**
```json
{
  "rejectionReason": "Thông tin người đại diện và địa chỉ hoạt động chưa được xác minh."
}
```

---

### 🟢 LUỒNG 3: QUẢN LÝ TỔ CHỨC TẠO TRẠM & BỔ NHIỆM TRƯỞNG TRẠM (`STATION_MANAGER`)

Sau khi được duyệt, người sáng lập tổ chức trở thành Quản lý tổ chức (`ORG_MANAGER`), bắt đầu mở các chi nhánh/trạm tiếp nhận và phân công nhân sự quản lý trạm.

#### 3.1. User01 đăng nhập lại để nhận Token có Role `ORG_MANAGER`
* **URL:** `POST http://localhost:8080/auth/login`
* **Body:** `user01` / `Password123!`
* 👉 **Lưu lại token mới:** `ORG_MANAGER_TOKEN`.

#### 3.2. Quản lý tổ chức tạo Trạm tiếp nhận trực thuộc (`POST /organizations/:id/stations`)
* **URL:** `POST http://localhost:8080/organizations/<ORG_ID>/stations`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "name": "Trạm Tiếp Nhận Thiện Nguyện - Thủ Đức",
  "address": "456 Đường Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP.HCM",
  "latitude": "10.8500",
  "longitude": "106.7700",
  "openingTime": "08:00",
  "closingTime": "17:00"
}
```
* **Kết quả:** Trạm được tạo với `isActive: false` (chờ kích hoạt).
* 👉 **Copy `_id` của Trạm vừa tạo:** `STATION_ID`.

#### 3.3. Bổ nhiệm Trưởng trạm (Có 2 cách linh hoạt)

##### 🔹 Cách A: Tạo mới tài khoản và gán làm Trưởng trạm (`POST /stations/:id/manager`)
* **URL:** `POST http://localhost:8080/stations/<STATION_ID>/manager`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "email": "manager_thuduc@gmail.com",
  "username": "manager_thuduc",
  "password": "Password123!",
  "fullName": "Trần Văn B (Trưởng Trạm)",
  "phone": "0901234567"
}
```
* **Kết quả:** Tạo User mới với `role: "STATION_MANAGER"` và gán `station.managerId = user._id`.

##### 🔹 Cách B: Bổ nhiệm một User đã có sẵn trên app (`PATCH /stations/:id/manager`)
* **URL:** `PATCH http://localhost:8080/stations/<STATION_ID>/manager`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "identifier": "0987654321"
}
```
*(Hệ thống tìm theo Số điện thoại hoặc Email, nâng role lên `STATION_MANAGER` và gán vào trạm).*

##### 🔹 Cách C: Gỡ quyền Trưởng trạm (khi chuyển đổi công tác)
* **URL:** `DELETE http://localhost:8080/stations/<STATION_ID>/manager`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`

#### 3.4. Admin duyệt kích hoạt Trạm (`PATCH /admin/stations/:id/approve`)
* **URL:** `PATCH http://localhost:8080/admin/stations/<STATION_ID>/approve`
* **Headers:** `Authorization: Bearer <ADMIN_TOKEN>`
* **Kết quả:** Trạm chuyển sang `isActive: true` và sẵn sàng đón người dân đến quyên góp.

---

### 🟢 LUỒNG 4: TRƯỞNG TRẠM (`STATION_MANAGER`) VẬN HÀNH & TUYỂN NHÂN VIÊN (`STAFF`)

Trưởng trạm được trao quyền tự chủ nhân sự tại điểm tiếp nhận của mình, không cần phụ thuộc vào Admin.

#### 4.1. Trưởng trạm đăng nhập lấy Token
* **URL:** `POST http://localhost:8080/auth/login`
* **Body (raw JSON):**
```json
{
  "username": "manager_thuduc",
  "password": "Password123!"
}
```
* 👉 **Lưu lại token Trưởng trạm:** `STATION_MANAGER_TOKEN`.

#### 4.2. Trưởng trạm tự tạo tài khoản STAFF cho trạm của mình (`POST /stationmanager/:stationId/staff`)
* **URL:** `POST http://localhost:8080/stationmanager/<STATION_ID>/staff`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "email": "staff_thuduc01@gmail.com",
  "username": "staff_thuduc01",
  "password": "Password123!",
  "fullName": "Lê Thị C (Nhân Viên Kho)",
  "phone": "0911223344"
}
```
* **Kết quả:** Trả về tài khoản `STAFF` mới được gán liên kết trong bảng `StationStaff`.
* 👉 **Copy `id` của Staff:** `STAFF_ID`.

#### 4.3. Xem danh sách Staff tại trạm (`GET /stationmanager/:stationId/staff`)
* **URL:** `GET http://localhost:8080/stationmanager/<STATION_ID>/staff`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`

#### 4.4. Cập nhật thông tin / Vô hiệu hóa Staff (`PATCH /stationmanager/:stationId/staff/:staffId`)
* **URL:** `PATCH http://localhost:8080/stationmanager/<STATION_ID>/staff/<STAFF_ID>`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "fullName": "Lê Thị C (Tổ Trưởng Kho)",
  "status": "active"
}
```

#### 4.5. Xóa / Gỡ Staff khỏi trạm (`DELETE /stationmanager/:stationId/staff/:staffId`)
* **URL:** `DELETE http://localhost:8080/stationmanager/<STATION_ID>/staff/<STAFF_ID>`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`

---

### 🟢 LUỒNG 5: VẬN HÀNH THIỆN NGUYỆN (CHIẾN DỊCH, QUYÊN GÓP, TÌNH NGUYỆN VIÊN)

Đây là giai đoạn kết nối giữa các bên: Tổ chức khởi động Chiến dịch, Người dân quyên góp đồ, Staff kiểm kê và Tình nguyện viên tham gia hỗ trợ.

#### 5.1. Khởi tạo Chiến dịch cứu trợ (Cấp Tổ chức)
* **Tạo chiến dịch:** `POST http://localhost:8080/campaigns`
  * Body: `{ title: "Cứu trợ lũ lụt Miền Trung 2026", startDate, endDate, organizationId: <ORG_ID> }`
* **Cấu hình danh mục cần tiếp nhận:** `POST http://localhost:8080/campaigns/<CAMPAIGN_ID>/items`
  * Body: `{ itemTypeId, targetQuantity: 1000, unit: "Cái" }`
* **Gán Trạm vào tham gia chiến dịch:** `POST http://localhost:8080/campaigns/<CAMPAIGN_ID>/stations`
  * Body: `{ stationId: <STATION_ID> }`

#### 5.2. Tiếp nhận vật phẩm quyên góp tại trạm
* Người dân đăng ký gửi đồ quyên góp (quần áo, sách vở, thuốc men...).
* **Staff hoặc Trưởng trạm tại trạm** tiếp nhận vật phẩm, kiểm đếm phân loại và xác nhận tiếp nhận vào kho trạm (`POST /contributions/...`).

#### 5.3. Điều phối Tình nguyện viên & Phân công nhiệm vụ (`Workforce`)
* **TNV đăng ký tham gia chiến dịch:** `POST http://localhost:8080/workforce/volunteers/register`
* **Trạm tạo nhiệm vụ cần nhân lực:** `POST http://localhost:8080/workforce/tasks`
  * Body: `{ title: "Phân loại quần áo ấm", stationId: <STATION_ID>, requiredVolunteers: 5 }`
* **TNV nộp đơn ứng tuyển nhiệm vụ:** `POST http://localhost:8080/workforce/tasks/<TASK_ID>/apply`
* **Trưởng trạm hoặc Staff duyệt đơn ứng tuyển:** `PATCH http://localhost:8080/workforce/tasks/applications/<APP_ID>/review`
* **TNV điểm danh khi hoàn thành:**
  * Điểm danh đến: `POST http://localhost:8080/workforce/tasks/check-in`
  * Điểm danh về: `POST http://localhost:8080/workforce/tasks/check-out`

---

## 🎯 BẢNG TỔNG KẾT LUỒNG VẬN HÀNH

```text
       [USER] (Nguyễn Văn A)
          │  nộp đơn đăng ký tổ chức
          ▼
       [ADMIN] (Admin System)
          │  Approve (Duyệt tổ chức)
          ▼
   [ORG_MANAGER] (Nguyễn Văn A)
          │
          ├──> Tạo Trạm (Thủ Đức, Quận 1...)
          │
          ├──> Bổ nhiệm STATION_MANAGER (Trần Văn B)
          │       │
          │       ├──> Tạo tài khoản STAFF (Lê Thị C)
          │       │       │
          │       │       └──> Kiểm kê, nhận đồ quyên góp vào kho
          │       │
          │       └──> Duyệt VOLUNTEER vào các nhiệm vụ tại trạm
          │
          └──> Khởi tạo Chiến dịch cứu trợ (Campaigns)
```
