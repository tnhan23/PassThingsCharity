# 📘 TÀI LIỆU ĐẶC TẢ CÁC LUỒNG NGHIỆP VỤ THEO VAI TRÒ (ALL ROLES WORKFLOW SPECIFICATION)
### Hệ thống Quản trị Quyên góp Thiện nguyện & Điều phối Cứu trợ PassThingsCharity

---

## 🏛️ TỔNG QUAN 6 VAI TRÒ (ROLES) TRONG HỆ THỐNG

| STT | Role Code | Tên vai trò | Trạng thái trong tài liệu |
| :---: | :--- | :--- | :--- |
| 1 | `USER` | Người dùng đại chúng / Người quyên góp | **Đã có** (Phần I) |
| 2 | `STAFF` | Nhân viên vận hành tại trạm | **Đã có** (Phần II) |
| 3 | `VOLUNTEER` | Tình nguyện viên cống hiến | **Bổ sung mới** (Phần III) |
| 4 | `STATION_MANAGER` | Trưởng trạm tiếp nhận | **Bổ sung mới** (Phần IV) |
| 5 | `ORG_MANAGER` | Quản lý tổ chức thiện nguyện | **Bổ sung mới** (Phần V) |
| 6 | `ADMIN` | Quản trị viên toàn hệ thống | **Bổ sung mới** (Phần VI) |

---

# PHẦN I: LUỒNG NGHIỆP VỤ DÀNH CHO `USER` (NGƯỜI DÙNG ĐẠI CHÚNG)

### 1. Luồng tặng đồ nhận điểm thưởng (Donation Flow)
* **Quy trình:**
  `User xem trạm / chiến dịch` $\rightarrow$ `Mang đồ đến trạm` $\rightarrow$ `Nhân viên kiểm tra và lập phiếu tiếp nhận` $\rightarrow$ `Backend ghi nhận đồ và cộng điểm` $\rightarrow$ `User xem lịch sử quyên góp và điểm đã nhận`.
* **API liên quan:**
  * `GET /stations`: Xem danh sách trạm tiếp nhận
  * `GET /stations/:id`: Xem chi tiết trạm và vị trí tọa độ
  * `GET /contributions?userId=<myUserId>&page=1&limit=20`: Xem lịch sử quyên góp của mình
  * `GET /contributions/:id`: Xem chi tiết phiếu tiếp nhận
  * `GET /gamification/points/policy`: Xem chính sách quy đổi điểm
  * `GET /gamification/me/points`: Xem số dư điểm và lịch sử cộng điểm
* **Công thức cộng điểm:** Điểm quyên góp = `20 + tổng round(số lượng × điểm mỗi đơn vị)`.

### 2. Luồng tham gia Job (Task) để nhận điểm
* **Quy trình:**
  `Xem job đang tuyển` $\rightarrow$ `Xem chi tiết` $\rightarrow$ `Đăng ký ứng tuyển` $\rightarrow$ `Chờ duyệt` $\rightarrow$ `Được phân công` $\rightarrow$ `Check-in` $\rightarrow$ `Check-out` $\rightarrow$ `Nhận điểm`.
* **API liên quan:**
  * `GET /workforce/tasks?recruitmentStatus=OPEN`: Xem các job đang mở tuyển
  * `GET /workforce/tasks/:id`: Chi tiết job
  * `POST /workforce/tasks/:taskId/apply`: Ứng tuyển job
  * `GET /workforce/tasks/applications/me`: Danh sách đơn đã nộp
  * `GET /workforce/tasks/me`: Danh sách job đã được nhận
  * `POST /workforce/tasks/check-in`: Điểm danh vào ca
  * `POST /workforce/tasks/check-out`: Hoàn thành ca và nhận điểm thưởng

### 3. Luồng nộp đơn xin thành lập Tổ chức thiện nguyện
* **Quy trình:**
  `User chuẩn bị hồ sơ pháp lý` $\rightarrow$ `Gửi yêu cầu đăng ký tổ chức` $\rightarrow$ `Chờ Admin duyệt` $\rightarrow$ `Được nâng quyền lên ORG_MANAGER`.
* **API:** `POST /organizations` (Gửi tên tổ chức, giấy phép, email, số điện thoại, mô tả).

---

# PHẦN II: LUỒNG NGHIỆP VỤ DÀNH CHO `STAFF` (NHÂN VIÊN TRẠM)

### 1. Luồng tiếp nhận đồ quyên góp
* `GET /contributions/lookup?q=...`: Tìm tài khoản người tặng (theo SĐT, email, username)
* `POST /contributions/upload-images`: Upload ảnh xác minh hàng hóa
* `POST /contributions`: Tạo phiếu tiếp nhận (tự động cộng kho và cộng điểm cho user)
* `POST /contributions/:id/images`: Bổ sung ảnh cho phiếu nếu cần

### 2. Luồng quản lý Kho trạm
* `GET /inventory?stationId=<id>`: Xem tồn kho thực tế và khả dụng của trạm
* `GET /inventory/history?stationId=<id>`: Lịch sử nhập / xuất / điều phối kho

### 3. Luồng công việc cá nhân của Staff
* `GET /workforce/tasks/me`: Xem nhiệm vụ phân công
* `POST /workforce/tasks/check-in`: Điểm danh vào làm
* `POST /workforce/tasks/check-out`: Điểm danh tan ca
* `GET /shiftstations/:stationId/schedules?staffId=<myStaffId>`: Xem lịch trực ca theo tuần/tháng
* `POST /shiftstations/schedules/:id/check-in`: Check-in ca trực trạm
* `POST /shiftstations/schedules/:id/check-out`: Check-out ca trực trạm

### 4. Luồng hỗ trợ quản lý Job & Duyệt Tình nguyện viên
* `POST /workforce/tasks`: Tạo job tuyển người tại trạm
* `PATCH /workforce/tasks/:id`: Sửa job / đóng / mở lại tuyển
* `GET /workforce/tasks/:taskId/applications`: Xem ứng viên nộp đơn
* `PATCH /workforce/tasks/applications/:id/review`: Duyệt hoặc từ chối ứng viên
* `POST /workforce/tasks/assign`: Giao việc trực tiếp cho TNV/Staff
* `PATCH /workforce/tasks/assignments/:assignmentId/absent`: Đánh dấu vắng mặt nếu bùng ca

---

# PHẦN III: LUỒNG NGHIỆP VỤ BỔ SUNG: `VOLUNTEER` (TÌNH NGUYỆN VIÊN)

Vai trò `VOLUNTEER` tập trung vào cống hiến sức lao động tại trạm/chiến dịch, tích lũy điểm thưởng, thăng cấp danh hiệu và nhận Chứng nhận điện tử (Certificate).

### 1. Luồng đăng ký tham gia Chiến dịch thiện nguyện (Campaign Level)
* **Quy trình:**
  `TNV xem danh sách chiến dịch đang diễn ra` $\rightarrow$ `Đăng ký làm TNV chiến dịch` $\rightarrow$ `Theo dõi trạng thái đơn duyệt`.
* **API liên quan:**
  * `GET /campaigns?status=ACTIVE`: Xem các chiến dịch đang hoạt động
  * `POST /workforce/volunteers/register`: Gửi đơn đăng ký tham gia chiến dịch
  * `GET /workforce/volunteers/me`: Xem lịch sử các đơn đăng ký chiến dịch của bản thân

### 2. Luồng thực hiện nhiệm vụ & Điểm danh tính giờ làm việc
* **Quy trình:**
  `Được duyệt vào Task` $\rightarrow$ `Đến trạm bấm Check-in` $\rightarrow$ `Làm nhiệm vụ (phân loại, đóng thùng, bốc vác)` $\rightarrow$ `Bấm Check-out kèm ghi chú hoàn thành` $\rightarrow$ `Nhận điểm thưởng và giờ tích lũy`.
* **API:**
  * `GET /workforce/tasks/me`: Danh sách việc cần làm hôm nay
  * `POST /workforce/tasks/check-in`: Ghi nhận `checkInTime` (Trạng thái chuyển sang `IN_PROGRESS`)
  * `POST /workforce/tasks/check-out`: Ghi nhận `checkOutTime`, tự động tính `hoursSpent`, cộng điểm thưởng và kiểm tra mở khóa danh hiệu

### 3. Luồng vinh danh, Bảng xếp hạng & Nhận Chứng nhận điện tử (Certificate)
* **Quy trình:**
  `Xem bảng xếp hạng cống hiến` $\rightarrow$ `Xem danh hiệu đã mở khóa` $\rightarrow$ `Xuất chứng nhận PDF khi đạt mốc`.
* **API liên quan:**
  * `GET /gamification/leaderboard`: Xem Bảng xếp hạng Top TNV tiêu biểu
  * `GET /gamification/me/achievements`: Xem danh sách huy hiệu/danh hiệu đã đạt
  * `GET /gamification/certificates`: Xem danh sách chứng nhận tình nguyện viên xuất sắc
  * `GET /gamification/certificates/:id/pdf`: Tải file chứng nhận bản PDF chính thức

---

# PHẦN IV: LUỒNG NGHIỆP VỤ BỔ SUNG: `STATION_MANAGER` (TRƯỞNG TRẠM)

Trưởng trạm là người chịu trách nhiệm toàn diện tại một điểm tiếp nhận: quản lý nhân sự Staff, phân ca trực, duyệt TNV chiến dịch, giám sát kho và điều phối luân chuyển hàng hóa.

### 1. Quản lý nhân sự Staff tại trạm
* **Tạo nhân viên mới cho trạm:** `POST /stationmanager/:stationId/staff`
* **Xem danh sách Staff thuộc trạm:** `GET /stationmanager/:stationId/staff`
* **Cập nhật thông tin/khóa tài khoản Staff:** `PATCH /stationmanager/:stationId/staff/:staffId`
* **Gỡ nhân viên khỏi trạm:** `DELETE /stationmanager/:stationId/staff/:staffId`

### 2. Thiết lập ca mẫu & Phân chia ca làm việc (Shift Rostering)
* **Tạo ca mẫu của trạm (Sáng/Chiều/Tối):** `POST /shiftstations/:stationId/shift-templates`
* **Xem các ca mẫu:** `GET /shiftstations/:stationId/shift-templates`
* **Phân lịch trực cho Staff theo ngày:** `POST /shiftstations/:stationId/schedules`
* **Xem toàn bộ bảng phân ca của trạm:** `GET /shiftstations/:stationId/schedules?date=...`

### 3. Phê duyệt Tình nguyện viên đăng ký Chiến dịch
* `GET /workforce/volunteers/campaign/:campaignId`: Xem danh sách đơn đăng ký TNV của chiến dịch tại trạm
* `PATCH /workforce/volunteers/:id/status`: Duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) đơn tham gia

### 4. Quản lý Điều phối luân chuyển hàng (Transfers) & Xuất kho cứu trợ (Relief)
* **Tạo lệnh chuyển hàng sang trạm khác:** `POST /transfers`
* **Xác nhận xuất kho chuyển đi:** `PATCH /transfers/:id/dispatch`
* **Xác nhận nhập kho hàng từ trạm khác gửi đến:** `PATCH /transfers/:id/receive`
* **Tạo đợt phát hàng cứu trợ cho bà con:** `POST /relief`
* **Hoàn tất phát quà cứu trợ:** `PATCH /relief/:id/status` (Chuyển sang `DISTRIBUTED`)

---

# PHẦN V: LUỒNG NGHIỆP VỤ BỔ SUNG: `ORG_MANAGER` (QUẢN LÝ TỔ CHỨC)

Đại diện cho tổ chức từ thiện (sau khi được Admin duyệt đơn thành lập tổ chức). Quản lý vĩ mô các chi nhánh trạm trực thuộc và phát động các chiến dịch cứu trợ lớn.

### 1. Quản lý mạng lưới Trạm trực thuộc tổ chức
* **Xem thông tin tổ chức của mình:** `GET /organizations/me`
* **Tạo trạm tiếp nhận mới trực thuộc:** `POST /stations` (Cung cấp tên trạm, địa chỉ, định vị GPS lat/long, bán kính hoạt động)
* **Xem danh sách các trạm của tổ chức:** `GET /stations?organizationId=<myOrgId>`
* **Bổ nhiệm Trưởng trạm:** `PATCH /users/:userId/station-manager`

### 2. Khởi tạo & Điều hành Chiến dịch thiện nguyện (Campaigns)
* **Tạo chiến dịch mới:** `POST /campaigns` (Tên chiến dịch, mục tiêu, ngày bắt đầu/kết thúc từ 5 đến 7 ngày)
* **Thêm danh mục vật phẩm cần quyên góp vào chiến dịch:** `POST /campaigns/:id/items`
* **Gán các trạm tham gia chiến dịch:** `POST /campaigns/:id/stations`
* **Xuất bản chiến dịch ra cộng đồng:** `PATCH /campaigns/:id/status` (Chuyển từ `DRAFT` $\rightarrow$ `PUBLISHED` / `ACTIVE`)
* **Theo dõi tiến độ quyên góp:** `GET /campaigns/:id/progress`

---

# PHẦN VI: LUỒNG NGHIỆP VỤ BỔ SUNG: `ADMIN` (QUẢN TRỊ VIÊN HỆ THỐNG)

Quản trị viên tối cao, phê duyệt tính hợp pháp của các tổ chức từ thiện, kiểm soát an toàn hệ thống và gửi thông báo khẩn cấp tới cộng đồng.

### 1. Xét duyệt Tổ chức thiện nguyện & Kích hoạt Trạm
* **Xem danh sách đơn đề nghị mở tổ chức:** `GET /admin/organizations/pending`
* **Phê duyệt hoặc từ chối tổ chức:** `PATCH /admin/organizations/:id/approve` (Kèm lý do duyệt/từ chối, hệ thống gửi email tự động thông báo)
* **Kích hoạt trạm hoạt động:** `PATCH /admin/stations/:id/activate`

### 2. Quản trị Tài khoản người dùng & Khóa tài khoản vi phạm
* **Xem toàn bộ danh sách người dùng:** `GET /users?role=...`
* **Khóa/Mở khóa tài khoản người dùng vi phạm:** `PATCH /users/:id/status` (`status: "banned"` / `"active"`)

### 3. Phát thông báo khẩn cấp (Push Notification System)
* **Gửi thông báo toàn hệ thống (Broadcast):** `POST /notifications` với `targetRole: "ALL"`
* **Gửi thông báo theo nhóm vai trò:** `POST /notifications` với `targetRole: "VOLUNTEER"` hoặc `"STAFF"`
* **Gửi đích danh:** `POST /notifications` kèm `userId` cụ thể

---

## 🎯 BẢNG TỔNG KẾT MA TRẬN PHÂN QUYỀN API CHO FRONTEND (RBAC MATRIX)

| Chức năng chính | Endpoint API | USER | VOLUNTEER | STAFF | STATION_MANAGER | ORG_MANAGER | ADMIN |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Xem danh sách trạm & chiến dịch** | `GET /stations`, `GET /campaigns` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Lịch sử quyên góp & Điểm cá nhân** | `GET /contributions`, `GET /gamification/me` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Đăng ký tham gia chiến dịch** | `POST /workforce/volunteers/register` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ứng tuyển nhiệm vụ (Job)** | `POST /workforce/tasks/:id/apply` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Check-in / Check-out Job** | `POST /workforce/tasks/check-in, out` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Nhập kho quyên góp** | `POST /contributions` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Xem tồn kho & Biến động kho** | `GET /inventory`, `/history` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Tạo job & Duyệt ứng viên** | `POST /tasks`, `PATCH /tasks/.../review` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Tạo tài khoản Staff tại trạm** | `POST /stationmanager/:id/staff` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Phân ca làm việc (Shifts)** | `POST /shiftstations/:id/schedules` | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Tạo Trạm & Tạo Chiến dịch** | `POST /stations`, `POST /campaigns` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Duyệt Tổ chức thiện nguyện** | `PATCH /admin/organizations/:id/approve` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Phát Thông báo hệ thống** | `POST /notifications` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
