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

#### 4.2. Trưởng trạm tạo mới tài khoản Nhân viên Staff (`POST /stationmanager/:stationId/staff`)
* **URL:** `POST http://localhost:8080/stationmanager/<STATION_ID>/staff`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>` *(hoặc `ORG_MANAGER_TOKEN`)*
* **Body (raw JSON):**
```json
{
  "email": "staff_lethic@gmail.com",
  "username": "staff_lethic",
  "password": "Password123!",
  "fullName": "Lê Thị C (Nhân Viên Trạm)",
  "phone": "0912345679"
}
```
* **Kết quả:** Trả về `201 Created` với `role: "STAFF"`, tự động tạo liên kết nhân sự tại trạm (`StationStaff`).
* 👉 **Lưu lại ID của nhân viên:** `STAFF_ID = user.id`.

#### 4.3. (Cách linh hoạt) Bổ nhiệm User đã có sẵn trên app làm Staff (`POST /stations/:id/staff/:userId`)
* **URL:** `POST http://localhost:8080/stations/<STATION_ID>/staff/<USER_ID>`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>` *(hoặc `ORG_MANAGER_TOKEN`, `ADMIN_TOKEN`)*
* **Kết quả:** Tự động nâng role của tài khoản lên `STAFF` và gán vào trạm.

#### 4.4. Xem danh sách nhân viên Staff trực thuộc trạm (`GET /stationmanager/:stationId/staff`)
* **URL:** `GET http://localhost:8080/stationmanager/<STATION_ID>/staff`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>` *(hoặc `ORG_MANAGER_TOKEN`)*
* **Kết quả:** Trả về danh sách toàn bộ Staff thuộc trạm (kèm thời điểm gán `assignedAt`, số điện thoại, trạng thái hoạt động).

#### 4.5. Cập nhật thông tin / Đổi mật khẩu cho Staff (`PATCH /stationmanager/:stationId/staff/:staffId`)
* **URL:** `PATCH http://localhost:8080/stationmanager/<STATION_ID>/staff/<STAFF_ID>`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>` *(hoặc `ORG_MANAGER_TOKEN`)*
* **Body (raw JSON):**
```json
{
  "fullName": "Lê Thị C (Cập nhật)",
  "phone": "0912345688",
  "status": "active"
}
```
*(Trưởng trạm có thể cập nhật số điện thoại, email, họ tên, đổi mật khẩu mới cho nhân viên hoặc khóa tài khoản bằng cách chuyển `status: "inactive"`)*.

#### 4.6. Gỡ nhân viên Staff khỏi trạm (`DELETE /stationmanager/:stationId/staff/:staffId`)
* **URL:** `DELETE http://localhost:8080/stationmanager/<STATION_ID>/staff/<STAFF_ID>`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>` *(hoặc `ORG_MANAGER_TOKEN`)*
* **Kết quả:** Gỡ Staff khỏi trạm tiếp nhận (`200 OK`). Tài khoản vẫn được bảo lưu trên hệ thống.

#### 4.7. Nhân viên Staff đăng nhập hệ thống để nhận Token vận hành (`POST /auth/login`)
*(Staff đăng nhập để lấy Token thực hiện các nghiệp vụ tiếp nhận đồ quyên góp, kiểm kê kho và xuất cứu trợ ở Luồng 5)*
* **URL:** `POST http://localhost:8080/auth/login`
* **Body (raw JSON):**
```json
{
  "username": "staff_lethic",
  "password": "Password123!"
}
```
* **Kết quả:** Trả về JWT Bearer Token với `role: "STAFF"`.
* 👉 **Lưu lại token nhân viên:** `STAFF_TOKEN`.

---


### 🟢 LUỒNG 5: VẬN HÀNH THIỆN NGUYỆN TOÀN DIỆN (CHIẾN DỊCH, QUYÊN GÓP, KHO, CỨU TRỢ & TNV)

Đây là phân hệ kết nối toàn diện giữa Tổ chức, Trạm, Người dân quyên góp, Nhân viên điều phối kho và Lực lượng Tình nguyện viên.

---

#### 5.1. Thiết Lập Danh Mục Nhu Yếu Phẩm Cứu Trợ (`Item Catalog`)
Trước khi kêu gọi quyên góp hoặc tạo chiến dịch, Quản trị viên hoặc Quản lý tổ chức thiết lập danh mục phân loại chuẩn.

##### 🔹 Bước 1: Tạo Danh mục hàng hóa (`POST /catalog/categories`)
* **URL:** `POST http://localhost:8080/catalog/categories`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "name": "Thực phẩm & Nhu yếu phẩm",
  "description": "Các loại thực phẩm khô, đồ hộp, nước uống phục vụ cứu trợ khẩn cấp"
}
```
* **Kết quả:** Trả về `201 Created` kèm `_id` của danh mục (`CATEGORY_ID`).

##### 🔹 Bước 2: Tạo Loại vật phẩm chi tiết (`POST /catalog/items`)
* **URL:** `POST http://localhost:8080/catalog/items`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "categoryId": "<CATEGORY_ID>",
  "name": "Mì tôm ăn liền",
  "unit": "BOX",
  "description": "Thùng mì tôm quy cách 30 gói/thùng"
}
```
*(Đơn vị `unit` hỗ trợ: `KG`, `PAIR`, `BOX`, `PACK`, `PIECE`)*.
* 👉 **Lưu lại `_id` của loại vật phẩm:** `ITEM_TYPE_ID`.

##### 🔹 Bước 3: Xem danh sách vật phẩm trong hệ thống (`GET /catalog/items`)
* **URL:** `GET http://localhost:8080/catalog/items` (Public không cần Token)

---

#### 5.2. Khởi Tạo & Cấu Hình Chiến Dịch Cứu Trợ (`Campaigns`)
Tổ chức từ thiện phát động đợt quyên góp, cấu hình chỉ tiêu số lượng và liên kết các trạm tiếp nhận đồ.

##### 🔹 Bước 1: Tạo Chiến dịch cứu trợ (`POST /campaigns`)
> ⚠️ **Lưu ý nghiệp vụ:** Thời gian chiến dịch (`startDate` đến `endDate`) bắt buộc phải từ **120 giờ đến 168 giờ** (tương đương 5 đến 7 ngày).
* **URL:** `POST http://localhost:8080/campaigns`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "title": "Cứu trợ đồng bào lũ lụt Miền Trung 2026",
  "description": "Chiến dịch tiếp nhận lương thực và quần áo ấm khẩn cấp cho vùng lũ",
  "startDate": "2026-11-01T00:00:00.000Z",
  "endDate": "2026-11-07T00:00:00.000Z",
  "organizationId": "<ORG_ID>"
}
```
* 👉 **Lưu lại `_id` của Chiến dịch:** `CAMPAIGN_ID`.

##### 🔹 Bước 2: Cấu hình chỉ tiêu vật phẩm cần quyên góp (`POST /campaigns/:id/items`)
* **URL:** `POST http://localhost:8080/campaigns/<CAMPAIGN_ID>/items`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "itemTypeId": "<ITEM_TYPE_ID>",
  "targetQuantity": 1000,
  "priority": "HIGH"
}
```
*(Priority gồm: `LOW`, `MEDIUM`, `HIGH`)*.

##### 🔹 Bước 3: Gán Trạm tiếp nhận tham gia vào chiến dịch (`POST /campaigns/:id/stations`)
* **URL:** `POST http://localhost:8080/campaigns/<CAMPAIGN_ID>/stations`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "stationId": "<STATION_ID>"
}
```

##### 🔹 Bước 4: Tìm trạm gần nhất thuộc chiến dịch theo GPS (`GET /campaigns/:id/stations`)
* **URL:** `GET http://localhost:8080/campaigns/<CAMPAIGN_ID>/stations?latitude=10.776889&longitude=106.700806&radius=15`
* **Kết quả:** Trả về danh sách trạm tiếp nhận có tính khoảng cách km (`distanceKm`) sắp xếp từ gần đến xa theo định vị của người dùng.

---

#### 5.3. Tải Lên & Nén Ảnh Tự Động Với Sharp & Cloudinary (`Uploads`)
Hệ thống tích hợp bộ xử lý ảnh Sharp giúp tự động xoay đúng chiều, xóa metadata EXIF riêng tư, nén kích thước tối đa 1600px và dung lượng < 500KB trước khi lưu trữ Cloudinary.

##### 🔹 Cách 1: Người dùng upload ảnh đại diện cá nhân (`POST /uploads/images`)
* **URL:** `POST http://localhost:8080/uploads/images`
* **Headers:** 
  * `Authorization: Bearer <USER_TOKEN>`
  * `Content-Type: multipart/form-data`
* **Body (form-data):**
  * Key: `image` (Type: File) -> Chọn file ảnh từ máy tính (JPEG, PNG, WebP)
* **Kết quả:** Trả về `201 Created` kèm đường dẫn ảnh CDN bảo mật `imageUrl`.

##### 🔹 Cách 2: Staff upload ảnh bằng chứng tiếp nhận đồ (`POST /contributions/upload-images`)
* **URL:** `POST http://localhost:8080/contributions/upload-images`
* **Headers:** 
  * `Authorization: Bearer <STAFF_TOKEN>`
  * `Content-Type: multipart/form-data`
* **Body (form-data):**
  * Key: `images` (Type: File, chọn từ 1 đến 5 ảnh chụp thực tế đồ quyên góp)
* **Kết quả:** Trả về danh sách `imageUrls` đã được tối ưu dung lượng để gắn vào phiếu tiếp nhận.

---

#### 5.4. Tiếp Nhận Vật Phẩm Quyên Góp Tại Trạm (`Inbound Contributions`)
Người dân mang đồ đến trạm. Nhân viên trạm tra cứu thông tin người cho, lập phiếu tiếp nhận, phân loại và lưu kho.

##### 🔹 Bước 1: Staff tra cứu nhanh người quyên góp (`GET /contributions/lookup`)
* **URL:** `GET http://localhost:8080/contributions/lookup?q=0987654321`
* **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
* *(Hệ thống tìm kiếm linh hoạt theo Số điện thoại, Email hoặc Tên tài khoản)*.
* 👉 **Lấy `_id` của người quyên góp:** `DONOR_ID`.

##### 🔹 Bước 2: Lập phiếu tiếp nhận đồ quyên góp (`POST /contributions`)
* **URL:** `POST http://localhost:8080/contributions`
* **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
* **Body (raw JSON):**
```json
{
  "userId": "<DONOR_ID>",
  "stationId": "<STATION_ID>",
  "campaignId": "<CAMPAIGN_ID>",
  "notes": "Người dân ủng hộ 50 thùng mì và quần áo ấm mới",
  "items": [
    {
      "itemTypeId": "<ITEM_TYPE_ID>",
      "quantity": 50,
      "unit": "BOX",
      "note": "Mì tôm Hảo Hảo còn hạn sử dụng trên 6 tháng"
    }
  ],
  "imageUrls": [
    "https://res.cloudinary.com/demo/image/upload/sample_box.jpg"
  ]
}
```
* **Kết quả:** Trả về `201 Created`, tự động cộng dồn số lượng vào tiến độ chiến dịch và **tự động thưởng điểm Gamification** cho người quyên góp.
* 👉 **Lưu lại mã phiếu:** `CONTRIBUTION_ID`.

##### 🔹 Bước 3: Cập nhật trạng thái phiếu tiếp nhận (`PATCH /contributions/:id/status`)
* **URL:** `PATCH http://localhost:8080/contributions/<CONTRIBUTION_ID>/status`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "status": "COMPLETED",
  "notes": "Đã kiểm đếm đủ số lượng và xếp vào kệ hàng số 2"
}
```
*(Trạng thái hỗ trợ: `PENDING`, `ACCEPTED`, `REJECTED`, `COMPLETED`)*.

---

#### 5.5. Điều Phối & Luân Chuyển Kho Giữa Các Trạm (`Campaign Transfers`)
Khi một trạm bị quá tải hoặc cần gom hàng về trạm trung tâm gần vùng thiên tai, hệ thống tạo lệnh chuyển kho.

##### 🔹 Bước 1: Tạo phiếu điều phối chuyển kho (`POST /transfers`)
* **URL:** `POST http://localhost:8080/transfers`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "campaignId": "<CAMPAIGN_ID>",
  "fromStationId": "<STATION_ID_A>",
  "toStationId": "<STATION_ID_B>",
  "responsibleUserId": "<STAFF_ID>",
  "transportMethod": "Xe tải 2.5 tấn - Biển số 51C-12345",
  "transportNote": "Chuyển gấp 50 thùng mì sang trạm điều phối trung tâm",
  "items": [
    {
      "itemTypeId": "<ITEM_TYPE_ID>",
      "quantity": 50,
      "unit": "BOX"
    }
  ]
}
```
* 👉 **Lưu lại `_id` phiếu chuyển:** `TRANSFER_ID`.

##### 🔹 Bước 2: Cập nhật lộ trình vận chuyển (`PATCH /transfers/:id/status`)
Quy trình trạng thái chuẩn: `PENDING` ➔ `PREPARING` ➔ `IN_TRANSIT` ➔ `RECEIVED` ➔ `COMPLETED`.
* **URL:** `PATCH http://localhost:8080/transfers/<TRANSFER_ID>/status`
* **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
* **Body (raw JSON):**
```json
{
  "status": "IN_TRANSIT",
  "transportNote": "Xe đã xuất bến và đang di chuyển trên quốc lộ 1A"
}
```
*(Khi xe đến trạm đích, Staff trạm nhận gọi lại API này với `status: "COMPLETED"` kèm `receivedBy: "<STAFF_RECEIVE_ID>"` để nhập kho trạm mới).*

---

#### 5.6. Xuất Kho Bàn Giao Cứu Trợ Đến Người Thụ Hưởng (`Relief Distribution`)
Ghi nhận bàn giao hiện vật cứu trợ cho Đại diện chính quyền địa phương, Ủy ban MTTQ hoặc bà con vùng bão lũ.

##### 🔹 Bước 1: Lập phiếu xuất kho bàn giao cứu trợ (`POST /relief`)
* **URL:** `POST http://localhost:8080/relief`
* **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
* **Body (raw JSON):**
```json
{
  "campaignId": "<CAMPAIGN_ID>",
  "stationId": "<STATION_ID>",
  "recipientName": "Ông Nguyễn Văn B - Đại diện UBND Xã",
  "recipientRole": "Chủ tịch MTTQ Xã Hải Lăng",
  "recipientPhone": "0988776655",
  "recipientAddress": "UBND Xã Hải Lăng, Huyện Hải Lăng, Tỉnh Quảng Trị",
  "distributionDate": "2026-11-05T09:00:00.000Z",
  "status": "PLANNED",
  "notes": "Bàn giao đợt 1 gồm 100 thùng mì cứu trợ đồng bào ngập sâu",
  "items": [
    {
      "itemTypeId": "<ITEM_TYPE_ID>",
      "quantity": 100,
      "unit": "BOX"
    }
  ],
  "closeCampaign": false
}
```
* 👉 **Lưu lại `_id` phiếu cứu trợ:** `RELIEF_ID`.

##### 🔹 Bước 2: Xác nhận hoàn tất bàn giao & Kết thúc chiến dịch (`PATCH /relief/:id/status`)
* **URL:** `PATCH http://localhost:8080/relief/<RELIEF_ID>/status`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "status": "COMPLETED",
  "notes": "Đã trao tận tay đại diện địa phương có biên bản bàn giao kèm theo",
  "closeCampaign": true
}
```
*(Nếu đặt `closeCampaign: true`, hệ thống sẽ đồng thời cập nhật trạng thái Chiến dịch sang hoàn tất).*

##### 🔹 Bước 3: Xem Báo cáo đối soát Tiếp nhận vs Phân phối (`GET /relief/summary/:campaignId`)
* **URL:** `GET http://localhost:8080/relief/summary/<CAMPAIGN_ID>`
* **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
* **Kết quả:** Trả về bảng đối chiếu chi tiết tổng số lượng đã quyên góp được vs tổng số lượng đã bàn giao cứu trợ thực tế theo từng loại vật phẩm.

---

#### 5.7. Điều Phối Tình Nguyện Viên & Quản Lý Ca Làm Việc (`Workforce`)
Quản lý vòng đời hoạt động của Tình nguyện viên: Đăng ký chiến dịch ➔ Ứng tuyển nhiệm vụ ➔ Phân công ➔ Điểm danh Check-in/Check-out.

##### 🔹 Bước 1: TNV đăng ký tham gia chiến dịch (`POST /workforce/volunteers/register`)
* **URL:** `POST http://localhost:8080/workforce/volunteers/register`
* **Headers:** `Authorization: Bearer <VOLUNTEER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "campaignId": "<CAMPAIGN_ID>",
  "note": "Tôi có thể tham gia khuân vác và phân loại hàng vào các ngày cuối tuần"
}
```
* 👉 **Lưu lại mã đăng ký:** `REGISTRATION_ID`.

##### 🔹 Bước 2: Quản lý trạm duyệt TNV vào chiến dịch (`PATCH /workforce/volunteers/:id/status`)
* **URL:** `PATCH http://localhost:8080/workforce/volunteers/<REGISTRATION_ID>/status`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "status": "APPROVED",
  "note": "Đã duyệt tham gia đội tiếp nhận và điều phối trạm"
}
```

##### 🔹 Bước 3: Trạm tạo Nhiệm vụ cần nhân lực (`POST /workforce/tasks`)
* **URL:** `POST http://localhost:8080/workforce/tasks`
* **Headers:** `Authorization: Bearer <STATION_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "campaignId": "<CAMPAIGN_ID>",
  "stationId": "<STATION_ID>",
  "title": "Bốc xếp hàng cứu trợ lên xe tải vận chuyển",
  "description": "Hỗ trợ tài xế bốc 100 thùng mì và 50 kiện quần áo ấm",
  "startTime": "2026-11-04T08:00:00.000Z",
  "endTime": "2026-11-04T12:00:00.000Z",
  "recruitmentStatus": "OPEN",
  "requiredVolunteers": 5,
  "volunteerDeadline": "2026-11-04T07:00:00.000Z",
  "rewardPoints": 50
}
```
* 👉 **Lưu lại mã nhiệm vụ:** `TASK_ID`.

##### 🔹 Bước 4: TNV nộp đơn ứng tuyển nhiệm vụ (`POST /workforce/tasks/:taskId/apply`)
* **URL:** `POST http://localhost:8080/workforce/tasks/<TASK_ID>/apply`
* **Headers:** `Authorization: Bearer <VOLUNTEER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "note": "Tôi có sức khỏe tốt, từng tham gia tình nguyện bốc vác năm ngoái"
}
```
* 👉 **Lưu lại mã đơn ứng tuyển:** `APPLICATION_ID`.

##### 🔹 Bước 5: Staff hoặc Trưởng trạm duyệt đơn ứng tuyển (`PATCH /workforce/tasks/applications/:id/review`)
* **URL:** `POST http://localhost:8080/workforce/tasks/applications/<APPLICATION_ID>/review` *(hoặc `PATCH`)*
* **Headers:** `Authorization: Bearer <STAFF_TOKEN>`
* **Body (raw JSON):**
```json
{
  "status": "APPROVED",
  "note": "Đã duyệt và giao nhiệm vụ ca sáng"
}
```
* **Kết quả:** Hệ thống tự động tạo một phân công nhiệm vụ (`TaskAssignment`).
* 👉 **Lưu lại mã phân công:** `ASSIGNMENT_ID`.

##### 🔹 Bước 6: TNV Check-in khi đến ca làm việc (`POST /workforce/tasks/check-in`)
* **URL:** `POST http://localhost:8080/workforce/tasks/check-in`
* **Headers:** `Authorization: Bearer <VOLUNTEER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "assignmentId": "<ASSIGNMENT_ID>"
}
```
* **Kết quả:** Trạng thái ca làm chuyển sang `IN_PROGRESS`, ghi nhận thời gian bắt đầu thực tế.

##### 🔹 Bước 7: TNV Check-out khi hoàn thành ca (`POST /workforce/tasks/check-out`)
* **URL:** `POST http://localhost:8080/workforce/tasks/check-out`
* **Headers:** `Authorization: Bearer <VOLUNTEER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "assignmentId": "<ASSIGNMENT_ID>",
  "hoursSpent": 4.0,
  "completionNote": "Đã hoàn thành bốc xếp toàn bộ hàng lên xe tải an toàn"
}
```
* **Kết quả:** Ghi nhận hoàn tất nhiệm vụ, lưu số giờ cống hiến và **tự động cộng `50 điểm thưởng` Gamification** vào tài khoản của TNV!

---

#### 5.8. Hệ Thống Gamification, Thành Tích & Cấp Chứng Chỉ Tình Nguyện
Ghi nhận và tri ân đóng góp của cộng đồng qua điểm số, huy hiệu vinh danh và giấy chứng nhận điện tử.

##### 🔹 Bước 1: Xem điểm tích lũy của bản thân (`GET /gamification/points/me`)
* **URL:** `GET http://localhost:8080/gamification/points/me`
* **Headers:** `Authorization: Bearer <USER_TOKEN>`
* **Kết quả:** Trả về tổng điểm hiện có (`totalPoints`) và lịch sử biến động điểm từ thiện.

##### 🔹 Bước 2: Thưởng điểm thưởng đặc biệt (`POST /gamification/points/award`)
*(Dành cho Quản lý tổ chức / Trưởng trạm thưởng điểm cống hiến xuất sắc)*
* **URL:** `POST http://localhost:8080/gamification/points/award`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "userId": "<USER_ID>",
  "points": 100,
  "type": "BONUS",
  "description": "Khen thưởng TNV tích cực hỗ trợ tăng ca phân loại hàng"
}
```

##### 🔹 Bước 3: Xem danh sách Thành tựu / Huy hiệu của bản thân (`GET /gamification/achievements/me`)
* **URL:** `GET http://localhost:8080/gamification/achievements/me`
* **Headers:** `Authorization: Bearer <USER_TOKEN>`
* **Kết quả:** Danh sách huy hiệu đã mở khóa (Ví dụ: *"Chiến Sĩ Áo Xanh"*, *"Tấm Lòng Vàng"*, *"Người Quyên Góp Tận Tâm"*).

##### 🔹 Bước 4: Cấp Giấy chứng nhận điện tử (`POST /gamification/certificates`)
* **URL:** `POST http://localhost:8080/gamification/certificates`
* **Headers:** `Authorization: Bearer <ORG_MANAGER_TOKEN>`
* **Body (raw JSON):**
```json
{
  "userId": "<VOLUNTEER_ID>",
  "campaignId": "<CAMPAIGN_ID>",
  "certificateType": "VOLUNTEER",
  "title": "Chứng Nhận Tình Nguyện Viên Xuất Sắc - Miền Trung 2026",
  "content": "Chứng nhận bạn đã cống hiến 40 giờ tình nguyện hỗ trợ cứu trợ lũ lụt",
  "pdfUrl": "https://res.cloudinary.com/demo/image/upload/cert_vol_2026.pdf"
}
```

##### 🔹 Bước 5: Người dùng xem bộ sưu tập Chứng chỉ của mình (`GET /gamification/certificates/me`)
* **URL:** `GET http://localhost:8080/gamification/certificates/me`
* **Headers:** `Authorization: Bearer <VOLUNTEER_TOKEN>`

---

### 🛡️ 6. BẢNG MÃ LỖI XÁC THỰC & PHÂN QUYỀN (ACCESS ERROR CODES DÀNH CHO FE)

Hệ thống đã chuẩn hóa toàn bộ phản hồi lỗi bảo mật thành định dạng JSON đồng nhất:
`{ "code": "<MÃ_LỖI>", "message": "<Thông báo tiếng Việt>", "error": "<Thông báo tiếng Việt>" }`

| HTTP Code | Error `code` | Trường hợp xảy ra | Khuyến nghị xử lý trên App/FE |
| :--- | :--- | :--- | :--- |
| **`401`** | `AUTH_TOKEN_MISSING` | Request thiếu header `Authorization` | Nhắc người dùng đăng nhập hoặc đính kèm token |
| **`401`** | `AUTH_HEADER_INVALID` | Header không đúng cú pháp `Bearer <TOKEN>` | Kiểm tra lại logic gắn token ở Interceptor FE |
| **`401`** | `AUTH_TOKEN_EXPIRED` | Phiên đăng nhập (JWT Token) đã hết hạn | Điều hướng người dùng về màn hình Login |
| **`401`** | `AUTH_TOKEN_INVALID` | Token bị sai chữ ký hoặc giải mã lỗi | Xóa token cũ trong LocalStorage và yêu cầu đăng nhập lại |
| **`401`** | `AUTH_USER_NOT_FOUND` | User ứng với Token không còn tồn tại trong DB | Đăng xuất tài khoản |
| **`401`** | `AUTH_ACCOUNT_DISABLED` | Tài khoản đã bị khóa hoặc chưa kích hoạt | Hiển thị thông báo tài khoản bị khóa |
| **`403`** | `FORBIDDEN` | Tài khoản đăng nhập thành công nhưng **không đủ Role** thực hiện API | Ẩn nút chức năng trên UI hoặc báo lỗi không đủ thẩm quyền |

---

## 🎯 BẢNG TỔNG KẾT VÒNG ĐỜI VẬN HÀNH THIỆN NGUYỆN

```text
       [USER] (Nguyễn Văn A)
          │  Nộp đơn đăng ký thành lập tổ chức
          ▼
       [ADMIN] (Admin System)
          │  Duyệt tổ chức & Nâng role lên ORG_MANAGER
          ▼
    [ORG_MANAGER] (Quản lý tổ chức)
          │
          ├──> Tạo Danh mục & Loại vật phẩm cứu trợ (/catalog)
          ├──> Khởi tạo Chiến dịch từ thiện (/campaigns)
          ├──> Mở Trạm tiếp nhận & Bổ nhiệm STATION_MANAGER (/stations)
          │
          ▼
    [STATION_MANAGER] (Trưởng trạm)
          │
          ├──> Tuyển dụng & Quản lý tài khoản STAFF (/stationmanager)
          ├──> Tạo các ca nhiệm vụ cần người (/workforce/tasks)
          ├──> Duyệt Tình nguyện viên tham gia ca trực
          │
          ▼
    [STAFF] (Nhân viên trạm)
          │
          ├──> Tra cứu Donor & Tiếp nhận đồ quyên góp (/contributions)
          ├──> Upload ảnh nén thực tế lên Cloudinary (/contributions/upload-images)
          ├──> Điều phối chuyển hàng sang trạm khác (/transfers)
          ├──> Xuất kho bàn giao cứu trợ tận tay địa phương (/relief)
          │
          ▼
    [VOLUNTEER] (Tình nguyện viên)
          │
          ├──> Đăng ký tham gia chiến dịch (/workforce/volunteers/register)
          ├──> Ứng tuyển ca làm việc (/workforce/tasks/apply)
          ├──> Check-in khi đến ca & Check-out khi xong ca
          │
          ▼
    [GAMIFICATION & CERTIFICATES]
          └──> Tự động tích lũy điểm thưởng, mở khóa danh hiệu & nhận chứng nhận!
```

---

> 💡 **Mẹo kiểm thử toàn diện:** Sử dụng tính năng **Environment Variables** trong Postman để lưu các biến: `{{ADMIN_TOKEN}}`, `{{ORG_MANAGER_TOKEN}}`, `{{STATION_MANAGER_TOKEN}}`, `{{STAFF_TOKEN}}`, `{{VOLUNTEER_TOKEN}}`, `{{USER_TOKEN}}`, `{{ORG_ID}}`, `{{STATION_ID}}`, `{{CAMPAIGN_ID}}`, `{{ITEM_TYPE_ID}}`, `{{TASK_ID}}`. Khi chạy các request tuần tự từ Luồng 1 đến Luồng 5, toàn bộ dữ liệu mẫu sẽ được kết nối liền mạch từ đầu đến cuối!
