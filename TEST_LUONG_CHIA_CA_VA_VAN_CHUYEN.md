# 📖 BÁO CÁO KIỂM THỬ LUỒNG PHÂN CA, VẬN CHUYỂN LIÊN TRẠM & KẾT QUẢ CHIẾN DỊCH

Tài liệu ghi nhận nhật ký kiểm thử thực tế từ **Swagger UI** hệ thống Quản trị Thiện nguyện **PassThingsCharity**.

1. Thông tin Người & Ngày kiểm thử:
- Người thực hiện: Trần Thái Dương
- Ngày thực hiện: 05/11/2026

3. Bảng Danh sách Tài khoản & Mật khẩu Test chuẩn:
   
- ADMIN: admin_system | 123456
- STATION_MANAGER (Trạm A - Quận 1): manager_quan1 | 123456789
- STATION_MANAGER (Trạm B - Gò Vấp): manager_govap | 123456789
- STAFF (Trạm B): staff1_govap | 123456
- USER / VOLUNTEER (Lái xe): volunteer_test_01 | 123456

3. Ghi chú nghiệp vụ phân ca tại Bước 7:
- "TRƯỜNG TRẠM B (manager_govap) KIỂM TRA & PHÂN CÔNG STAFF B (staff1_govap) NHẬN HÀNG (Vì staff Gò Vấp đã phân công ca trực là ngày mai 06/11/2026 nên test trước người nhận hàng là Trưởng trạm)".
---

## 🏛️ TÓM TẮT NHÂN SỰ & CẤU HÌNH KIỂM THỬ

* **Tổ chức từ thiện:** Tổ Chức Cứu Trợ PassThingsCharity (`671000000000000000000001`)
* **Trạm A (Nguồn - Xuất kho):** Trạm Tiếp Nhận Trung Tâm 01 - Quận 1 (`671000000000000000000011`)
* **Trạm B (Đích - Nhập kho):** Trạm Tiếp Nhận Gò Vấp (`671000000000000000000016`)
* **Chiến dịch:** Cứu trợ lũ lụt Miền Trung 2026 (`6acdef2e9fc3bf0d61d9d00b`)
* **Loại vật phẩm:** Mì Gói Cứu Trợ (`6523456789abcdef00000202` - Đơn vị: `BOX`)

---

## 🚀 CHI TIẾT NHẬT KÝ KIỂM THỬ 17 BƯỚC THỰC TẾ

### 1. Bổ nhiệm Trưởng Trạm A (Quận 1)
* **Thao tác:** Bổ nhiệm tài khoản `manager_quan1` làm Trưởng Trạm Quận 1.
* (username: `manager_quan1`, password: `123456789`)
* **API Endpoint:** `PATCH /stations/671000000000000000000011/manager`
* **Kết quả trả về:**
```json
{
  "message": "Đã bổ nhiệm Trần Văn Bình (Trưởng Trạm) làm Trưởng trạm thành công.",
  "manager": {
    "id": "6ad6197c1fabae084fd501e8",
    "username": "manager_quan1",
    "fullName": "Trần Văn Bình (Trưởng Trạm)",
    "role": "STATION_MANAGER"
  },
  "stationId": "671000000000000000000011"
}
```

---

### 2. Bổ nhiệm Trưởng Trạm B (Gò Vấp) & Gán Staff B
* **Thao tác:** Bổ nhiệm tài khoản `manager_govap` làm Trưởng Trạm Gò Vấp  (username: `manager_govap`, password: `123456789`) và gán Nhân viên Staff B  (`staff1_govap`) trực thuộc trạm.
* **API Endpoint:** `PATCH /stations/671000000000000000000016/manager`
* **Kết quả trả về:**
```json
{
  "message": "Đã bổ nhiệm Trần Thái Dương làm Trưởng trạm thành công.",
  "manager": {
    "id": "6aec4edd3f2c4b6deb4f495e",
    "username": "manager_govap",
    "fullName": "Trần Thái Dương",
    "role": "STATION_MANAGER"
  },
  "stationId": "671000000000000000000016"
}
```

---

### 3. Nạp tồn kho 1,000 Thùng Mì tại Trạm A (Quận 1)
* **Thao tác:** Khởi tạo/nạp sẵn 1,000 BOX Mì tôm khả dụng tại kho Trạm A để phục vụ luồng vận chuyển.
* **API Endpoint:** `POST /inventory/stations/671000000000000000000011`
* **Kết quả trả về:**
```json
{
  "message": "Đã cập nhật kho và lưu lịch sử điều chỉnh.",
  "data": {
    "_id": "6ae7c3495b1443dbbc10e740",
    "stationId": "671000000000000000000011",
    "itemTypeId": "6523456789abcdef00000202",
    "unit": "BOX",
    "quantity": 1000,
    "createdAt": "2026-11-01T22:55:05.965Z",
    "updatedAt": "2026-11-05T13:30:07.341Z"
  }
}
```

---

### 4. Phân ca làm việc cho Nhân viên Trạm Gò Vấp (Ngày 06/11/2026)
* **Thao tác:** Trưởng trạm Gò Vấp phân ca trực nhận hàng điều phối cho Nhân viên Staff B (`staff1_govap`).
* **API Endpoint:** `POST /shiftstations/671000000000000000000016/schedules`
* **Kết quả trả về:**
```json
{
  "message": "Phân ca làm việc thành công.",
  "data": {
    "requiredStaff": 1,
    "stationId": "671000000000000000000016",
    "templateId": "6aeb931cf93048e05d5307d2",
    "date": "2026-11-06",
    "staffId": "6aec51653f2c4b6deb4f495f",
    "status": "SCHEDULED",
    "checkInTime": null,
    "checkOutTime": null,
    "assignedBy": "6aec4edd3f2c4b6deb4f495e",
    "note": "Phân ca chiều trực nhận hàng điều phối tại Trạm Gò Vấp",
    "_id": "6aec869be8b2871fa170463d",
    "createdAt": "2026-11-05T13:37:31.039Z",
    "updatedAt": "2026-11-05T13:37:31.039Z"
  }
}
```

---

### 5. Tạo lệnh vận chuyển từ Quận 1 sang Gò Vấp (50 Thùng Mì)
* **Thao tác:** Trưởng Trạm Quận 1 tạo lệnh luân chuyển 50 BOX Mì tôm sang Trạm Gò Vấp.
* **API Endpoint:** `POST /transfers`
* **Kết quả trả về:**
```json
{
  "message": "Tạo lệnh điều phối hàng giữa các trạm thành công.",
  "transfer": {
    "approvalStatus": "PENDING",
    "sourceAssignedAt": "2026-11-05T14:00:24.548Z",
    "code": "TRF-261105-2321",
    "campaignId": "6acdef2e9fc3bf0d61d9d00b",
    "fromStationId": "671000000000000000000011",
    "toStationId": "671000000000000000000016",
    "createdBy": "6ad6197c1fabae084fd501e8",
    "responsibleUserId": "6ad6197c1fabae084fd501e8",
    "receivedBy": null,
    "status": "PENDING",
    "transportMethod": "Xe tải 2.5 tấn",
    "transportNote": "Chuyển 50 thùng mì từ Quận 1 sang Gò Vấp",
    "_id": "6aec8bf8e8b2871fa170463f",
    "createdAt": "2026-11-05T14:00:24.548Z",
    "updatedAt": "2026-11-05T14:00:24.548Z",
    "__v": 0
  },
  "items": [
    {
      "dispatchedQuantity": 0,
      "receivedQuantity": 0,
      "transferId": "6aec8bf8e8b2871fa170463f",
      "itemTypeId": "6523456789abcdef00000202",
      "quantity": 50,
      "unit": "BOX",
      "_id": "6aec8bf8e8b2871fa1704640",
      "createdAt": "2026-11-05T14:00:24.612Z",
      "updatedAt": "2026-11-05T14:00:24.612Z",
      "__v": 0
    }
  ]
}
```

---

### 6. Admin duyệt phiếu vận chuyển
* **Điều kiện trước khi duyệt:** Trạm B phải có trưởng trạm đang hoạt động được gán vào `managerId`. Nếu chưa có, API trả `409`; gán trưởng trạm B trước rồi mới duyệt để hệ thống có người nhận thông báo.
* **Thao tác:** Admin hoặc Trưởng Trạm A duyệt kế hoạch vận chuyển. Hệ thống tự động khóa giữ chỗ (reserve) 50 thùng mì tại Trạm A và tạo thông báo đích danh cho trưởng trạm B.
* **API Endpoint:** `PATCH /transfers/6aec8bf8e8b2871fa170463f/approval`
* **Trưởng trạm B nhận phiếu:** Đăng nhập bằng tài khoản trưởng trạm B rồi gọi `GET /notifications/me` để kiểm tra thông báo `ASSIGN_TRANSFER_RECEIVER`, hoặc lấy trực tiếp danh sách phiếu tại `GET /transfers?toStationId={stationBId}&status=PREPARING`. API danh sách chỉ trả phiếu thuộc trạm mà tài khoản quản lý/được phân công. Mở phiếu bằng `GET /transfers/{transferId}`.
* **Kết quả trả về:**
```json
{
  "transfer": {
    "_id": "6aec8bf8e8b2871fa170463f",
    "approvalStatus": "APPROVED",
    "sourceAssignedAt": "2026-11-05T14:00:24.548Z",
    "code": "TRF-261105-2321",
    "campaignId": "6acdef2e9fc3bf0d61d9d00b",
    "fromStationId": "671000000000000000000011",
    "toStationId": "671000000000000000000016",
    "createdBy": "6ad6197c1fabae084fd501e8",
    "responsibleUserId": "6ad6197c1fabae084fd501e8",
    "receivedBy": null,
    "status": "PREPARING",
    "transportMethod": "Xe tải 2.5 tấn",
    "transportNote": "Chuyển 50 thùng mì từ Quận 1 sang Gò Vấp",
    "createdAt": "2026-11-05T14:00:24.548Z",
    "updatedAt": "2026-11-05T14:13:44.863Z",
    "__v": 0,
    "approvedBy": "6ac7b15a501de8a3e18592c9",
    "approvedAt": "2026-11-05T14:13:44.863Z",
    "approvalNote": "Admin đồng ý duyệt phiếu chuyển 50 thùng mì sang Trạm Gò Vấp"
  },
  "items": [
    {
      "_id": "6aec8bf8e8b2871fa1704640",
      "dispatchedQuantity": 0,
      "receivedQuantity": 0,
      "transferId": "6aec8bf8e8b2871fa170463f",
      "itemTypeId": {
        "_id": "6523456789abcdef00000202",
        "name": "Mì Gói Cứu Trợ",
        "unit": "BOX"
      },
      "quantity": 50,
      "unit": "BOX",
      "createdAt": "2026-11-05T14:00:24.612Z",
      "updatedAt": "2026-11-05T14:00:24.612Z",
      "__v": 0,
      "allocatedQuantity": 0,
      "unallocatedQuantity": 50,
      "inTransitQuantity": 0
    }
  ],
  "shipments": []
}
```

---

### 7. Trưởng Trạm B (Gò Vấp) gán người phụ trách nhận hàng
* **Thao tác:** Trưởng Trạm Gò Vấp (`manager_govap`) tự gán trách nhiệm phụ trách tiếp nhận lô hàng tại Trạm B.
* **API Endpoint:** `PATCH /transfers/6aec8bf8e8b2871fa170463f/responsibilities`
* **Body:** `{"receivedBy":"<userId nhân viên hoặc trưởng trạm tại B>"}`. Sau khi gán, người phụ trách B có thể xác nhận nhận kho ở bước RECEIVE sau khi tài xế báo giao.
* **Kết quả trả về:**
```json
{
  "transfer": {
    "_id": "6aec8bf8e8b2871fa170463f",
    "approvalStatus": "APPROVED",
    "sourceAssignedAt": "2026-11-05T14:00:24.548Z",
    "code": "TRF-261105-2321",
    "campaignId": "6acdef2e9fc3bf0d61d9d00b",
    "fromStationId": "671000000000000000000011",
    "toStationId": "671000000000000000000016",
    "createdBy": "6ad6197c1fabae084fd501e8",
    "responsibleUserId": "6ad6197c1fabae084fd501e8",
    "receivedBy": "6aec4edd3f2c4b6deb4f495e",
    "status": "PREPARING",
    "transportMethod": "Xe tải 2.5 tấn",
    "transportNote": "Chuyển 50 thùng mì từ Quận 1 sang Gò Vấp",
    "createdAt": "2026-11-05T14:00:24.548Z",
    "updatedAt": "2026-11-05T14:19:12.724Z",
    "__v": 0,
    "approvalNote": "Admin đồng ý duyệt phiếu chuyển 50 thùng mì sang Trạm Gò Vấp",
    "approvedAt": "2026-11-05T14:13:44.863Z",
    "approvedBy": "6ac7b15a501de8a3e18592c9",
    "destinationAssignedAt": "2026-11-05T14:19:12.641Z"
  },
  "items": [
    {
      "_id": "6aec8bf8e8b2871fa1704640",
      "dispatchedQuantity": 0,
      "receivedQuantity": 0,
      "transferId": "6aec8bf8e8b2871fa170463f",
      "itemTypeId": {
        "_id": "6523456789abcdef00000202",
        "name": "Mì Gói Cứu Trợ",
        "unit": "BOX"
      },
      "quantity": 50,
      "unit": "BOX",
      "createdAt": "2026-11-05T14:00:24.612Z",
      "updatedAt": "2026-11-05T14:00:24.612Z",
      "__v": 0,
      "allocatedQuantity": 0,
      "unallocatedQuantity": 50,
      "inTransitQuantity": 0
    }
  ],
  "shipments": []
}
```

---

### 8. Trưởng Trạm A tạo Nhiệm vụ Lái xe vận chuyển
* **Thao tác:** Tạo ca nhiệm vụ chở hàng liên trạm cho lực lượng tình nguyện viên/lái xe.
* **API Endpoint:** `POST /workforce/tasks`
* **Kết quả trả về:**
```json
{
  "message": "Tạo nhiệm vụ thành công.",
  "task": {
    "campaignId": {
      "_id": "6acdef2e9fc3bf0d61d9d00b",
      "title": "Cứu trợ lũ lụt Miền Trung 2026",
      "status": "ACTIVE"
    },
    "stationId": {
      "imageUrl": null,
      "_id": "671000000000000000000011",
      "address": "456 Đường Lê Lợi, Quận 1, TP.HCM",
      "closingTime": "20:00",
      "isActive": true,
      "latitude": "10.776889",
      "longitude": "106.700806",
      "name": "Trạm Tiếp Nhận Trung Tâm 01 (Quận 1)",
      "openingTime": "08:00"
    },
    "transferId": "6aec8bf8e8b2871fa170463f",
    "title": "Lái xe vận chuyển 50 thùng mì từ Quận 1 sang Gò Vấp",
    "description": "Chở hàng cứu trợ bằng xe tải 2.5 tấn",
    "startTime": "2026-11-06T08:00:00.000Z",
    "endTime": "2026-11-06T18:00:00.000Z",
    "status": "PENDING",
    "recruitmentStatus": "OPEN",
    "requiredVolunteers": 1,
    "volunteerDeadline": null,
    "rewardPoints": 50,
    "createdBy": "6ad6197c1fabae084fd501e8",
    "_id": "6aec9141e8b2871fa1704643",
    "createdAt": "2026-11-05T14:22:57.780Z",
    "updatedAt": "2026-11-05T14:22:57.780Z",
    "__v": 0,
    "slots": {
      "total": 1,
      "approved": 0,
      "pending": 0,
      "remaining": 1,
      "isFull": false
    }
  }
}
```

---

### 9. Phân công Lái xe cho Tình nguyện viên (`volunteer_test_01`)
* **Thao tác:** Duyệt phân công tài xế `volunteer_test_01` vào ca chở hàng.
* **API Endpoint:** `POST /workforce/tasks/6aec9141e8b2871fa1704643/assign`
* **Kết quả trả về:**
```json
{
  "message": "Participant assigned.",
  "application": {
    "_id": "6aec9333e8b2871fa1704644",
    "taskId": "6aec9141e8b2871fa1704643",
    "userId": "6acbbb6a7faf5d01bb5261e6",
    "status": "APPROVED",
    "appliedAt": "2026-11-05T14:31:15.401Z",
    "createdAt": "2026-11-05T14:31:15.402Z",
    "updatedAt": "2026-11-05T14:31:16.197Z",
    "__v": 0,
    "reviewedBy": "6ad6197c1fabae084fd501e8",
    "reviewedAt": "2026-11-05T14:31:16.197Z"
  },
  "assignment": {
    "taskId": "6aec9141e8b2871fa1704643",
    "assigneeId": "6acbbb6a7faf5d01bb5261e6",
    "assigneeType": "VOLUNTEER",
    "status": "ASSIGNED",
    "absencePenaltyPoints": 0,
    "hoursSpent": 0,
    "assignedBy": "6ad6197c1fabae084fd501e8",
    "_id": "6aec9334e8b2871fa1704645",
    "assignedAt": "2026-11-05T14:31:16.056Z",
    "createdAt": "2026-11-05T14:31:16.056Z",
    "updatedAt": "2026-11-05T14:31:16.056Z",
    "__v": 0
  },
  "task": {
    "_id": "6aec9141e8b2871fa1704643",
    "campaignId": "6acdef2e9fc3bf0d61d9d00b",
    "stationId": "671000000000000000000011",
    "transferId": "6aec8bf8e8b2871fa170463f",
    "title": "Lái xe vận chuyển 50 thùng mì từ Quận 1 sang Gò Vấp",
    "description": "Chở hàng cứu trợ bằng xe tải 2.5 tấn",
    "startTime": "2026-11-06T08:00:00.000Z",
    "endTime": "2026-11-06T18:00:00.000Z",
    "status": "ASSIGNED",
    "recruitmentStatus": "FILLED",
    "requiredVolunteers": 1,
    "volunteerDeadline": null,
    "rewardPoints": 50,
    "createdBy": "6ad6197c1fabae084fd501e8",
    "createdAt": "2026-11-05T14:22:57.780Z",
    "updatedAt": "2026-11-05T14:31:16.124Z",
    "__v": 0,
    "slots": {
      "total": 1,
      "approved": 1,
      "pending": 0,
      "remaining": 0,
      "isFull": true
    }
  }
}
```

---

### 10. Lái xe TNV điểm danh Check-in nhận ca
* **Thao tác:** Tài xế `volunteer_test_01` đăng nhập và gọi Check-in ca trực.
* **API Endpoint:** `POST /workforce/tasks/check-in`
* **Kết quả trả về:**
```json
{
  "message": "Điểm danh vào ca thành công!",
  "assignment": {
    "_id": "6aec9334e8b2871fa1704645",
    "taskId": "6aec9141e8b2871fa1704643",
    "assigneeId": "6acbbb6a7faf5d01bb5261e6",
    "assigneeType": "VOLUNTEER",
    "status": "IN_PROGRESS",
    "absencePenaltyPoints": 0,
    "hoursSpent": 0,
    "assignedBy": "6ad6197c1fabae084fd501e8",
    "assignedAt": "2026-11-05T14:31:16.056Z",
    "createdAt": "2026-11-05T14:31:16.056Z",
    "updatedAt": "2026-11-05T14:39:28.854Z",
    "__v": 0,
    "checkInTime": "2026-11-05T14:39:28.853Z"
  }
}
```

---

### 11. Trưởng Trạm A lập Lô hàng Shipment
* **Thao tác:** Phân bổ 50 thùng mì tôm từ phiếu chuyển vào lô hàng shipment gắn với tài xế.
* **API Endpoint:** `POST /transfers/6aec8bf8e8b2871fa170463f/shipments`
* **Kết quả trả về:**
```json
{
  "transfer": {
    "_id": "6aec8bf8e8b2871fa170463f",
    "approvalStatus": "APPROVED",
    "code": "TRF-261105-2321",
    "status": "PREPARING"
  },
  "shipment": {
    "_id": "6aec9602e8b2871fa1704646",
    "transferId": "6aec8bf8e8b2871fa170463f",
    "assignmentId": "6aec9334e8b2871fa1704645",
    "carrierId": "6acbbb6a7faf5d01bb5261e6",
    "status": "ASSIGNED",
    "items": [
      {
        "transferItemId": "6aec8bf8e8b2871fa1704640",
        "quantity": 50,
        "reportedQuantity": 0,
        "receivedQuantity": 0
      }
    ]
  }
}
```

---

### 12. Trưởng Trạm A Upload ảnh & Xác nhận Xuất Bến (`DISPATCH`)
* **Thao tác:** Upload ảnh minh chứng bốc xếp hàng tại Trạm A lên Cloudinary và gọi xác nhận xuất bến. Kho Trạm A chính thức bị trừ 50 thùng mì.
* **API Endpoint:** `POST /transfers/6aec8bf8e8b2871fa170463f/shipments/6aec9602e8b2871fa1704646/dispatch`
* **Kết quả trả về:**
```json
{
  "transfer": {
    "_id": "6aec8bf8e8b2871fa170463f",
    "status": "IN_TRANSIT"
  },
  "shipment": {
    "_id": "6aec9602e8b2871fa1704646",
    "status": "DISPATCHED",
    "evidence": [
      {
        "stage": "DISPATCH",
        "actorId": "6ad6197c1fabae084fd501e8",
        "imageUrls": [
          "https://res.cloudinary.com/djfr51v2j/image/upload/v1793890015/PassThingsCharity/transfer-evidence/46994171-62cf-446e-b704-ca5ffe2a4635.jpg"
        ],
        "note": "Trạm Quận 1 đã xuất kho 50 thùng mì lên xe tải"
      }
    ]
  },
  "items": [
    {
      "_id": "6aec8bf8e8b2871fa1704640",
      "dispatchedQuantity": 50,
      "inTransitQuantity": 50
    }
  ]
}
```

---

### 13. Lái xe TNV Upload ảnh & Báo đã giao đến Trạm B (`REPORT`)
* **Thao tác:** Lái xe upload ảnh hàng chở tới cổng Trạm B và báo đã giao 50 thùng mì.
* **API Endpoint:** `POST /transfers/6aec8bf8e8b2871fa170463f/shipments/6aec9602e8b2871fa1704646/report`
* **Kết quả trả về:**
```json
{
  "shipment": {
    "_id": "6aec9602e8b2871fa1704646",
    "status": "REPORTED",
    "items": [
      {
        "transferItemId": "6aec8bf8e8b2871fa1704640",
        "quantity": 50,
        "reportedQuantity": 50,
        "receivedQuantity": 0
      }
    ]
  }
}
```

---

### 14. Trưởng Trạm B Upload ảnh & Xác nhận Nhập Kho (`RECEIVE`)
* **Thao tác:** Trưởng Trạm Gò Vấp kiểm đếm đủ 50 thùng mì, upload ảnh và xác nhận nhập kho Trạm B. Kho Trạm B chính thức được cộng 50 thùng mì vào kho.
* **API Endpoint:** `POST /transfers/6aec8bf8e8b2871fa170463f/shipments/6aec9602e8b2871fa1704646/receive`
* **Kết quả trả về:**
```json
{
  "transfer": {
    "_id": "6aec8bf8e8b2871fa170463f",
    "status": "RECEIVED"
  },
  "shipment": {
    "_id": "6aec9602e8b2871fa1704646",
    "status": "RECEIVED",
    "items": [
      {
        "transferItemId": "6aec8bf8e8b2871fa1704640",
        "quantity": 50,
        "reportedQuantity": 50,
        "receivedQuantity": 50
      }
    ]
  }
}
```

---

### 15. Lái xe TNV Check-out & Nhận 50 Điểm Thưởng Gamification
* **Thao tác:** Lái xe Check-out hoàn thành ca trực. Hệ thống ghi nhận số giờ cống hiến và tự động cộng 50 điểm thưởng.
* **API Endpoint:** `POST /workforce/tasks/check-out`
* **Kết quả trả về:**
```json
{
  "message": "Điểm danh kết thúc ca thành công và đã ghi nhận điểm thưởng.",
  "assignment": {
    "_id": "6aec9334e8b2871fa1704645",
    "status": "COMPLETED",
    "hoursSpent": 0.5,
    "checkOutTime": "2026-11-05T15:09:46.373Z"
  },
  "hoursSpent": 0.5,
  "gamification": {
    "pointsAwarded": 50,
    "transaction": {
      "_id": "6aec9c3bf93048e05d532e79",
      "type": "VOLUNTEER_TASK",
      "points": 50,
      "description": "Cộng 50 điểm thưởng hoàn thành nhiệm vụ \"Lái xe vận chuyển 50 thùng mì từ Quận 1 sang Gò Vấp\" (0.5 giờ làm việc)."
    }
  }
}
```

---

### 16. Admin chuyển trạng thái Chiến dịch sang COMPLETED
* **Thao tác:** Chuyển chiến dịch sang trạng thái hoàn thành để chuẩn bị đăng báo cáo kết quả.
* **API Endpoint:** `PATCH /campaigns/6acdef2e9fc3bf0d61d9d00b/status`
* **Kết quả trả về:**
```json
{
  "message": "Campaign status updated to COMPLETED.",
  "campaign": {
    "_id": "6acdef2e9fc3bf0d61d9d00b",
    "title": "Cứu trợ lũ lụt Miền Trung 2026",
    "status": "COMPLETED"
  }
}
```

---

### 17. Admin Báo cáo Kết quả Chiến dịch (`Campaign.results`)
* **Thao tác:** Đăng bài báo cáo kết quả tổng kết chiến dịch, ảnh hoạt động và đợt trao cứu trợ tận tay cho người dân.
* **API Endpoint:** `PATCH /campaigns/6acdef2e9fc3bf0d61d9d00b/results`
* **Kết quả trả về:**
```json
{
  "results": {
    "summary": "Chiến dịch đã hoàn thành xuất sắc đợt vận chuyển liên trạm và trao 10 thùng mì tôm cứu trợ cho bà con.",
    "images": [
      "https://res.cloudinary.com/djfr51v2j/image/upload/v1793891236/PassThingsCharity/transfer-evidence/924ab9ca-23c4-45bd-b790-4da4077ffd71.jpg"
    ],
    "handovers": [
      {
        "recipientName": "Nguyễn Văn A",
        "recipientRole": "Đại diện bà con Xã Hải Lăng",
        "recipientAddress": "UBND Xã Hải Lăng, Quảng Trị",
        "completedAt": "2026-11-05T15:00:00.000Z",
        "items": [
          {
            "itemTypeId": "6523456789abcdef00000202",
            "quantity": 10,
            "unit": "BOX"
          }
        ],
        "imageUrls": [
          "https://res.cloudinary.com/djfr51v2j/image/upload/v1793891236/PassThingsCharity/transfer-evidence/924ab9ca-23c4-45bd-b790-4da4077ffd71.jpg"
        ]
      }
    ],
    "publishedAt": "2026-11-05T15:14:05.597Z",
    "updatedAt": "2026-11-05T15:14:05.597Z",
    "updatedBy": "6ac7b15a501de8a3e18592c9"
  }
}
```

---

## 🎉 TỔNG KẾT
Toàn bộ luồng nghiệp vụ Phân ca, Vận chuyển kho liên trạm (Quận 1 ➔ Gò Vấp), Điểm danh Check-in/Check-out cộng điểm thưởng Gamification và Báo cáo Kết quả Chiến dịch đã được kiểm thử thực tế thành công 100% trên Swagger UI và đồng bộ dữ liệu chuẩn xác lên MongoDB Cloud Atlas!
