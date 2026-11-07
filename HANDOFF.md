# Bàn giao công việc: test vận chuyển và kết quả chiến dịch

## Yêu cầu của người dùng

Người dùng đã có một trạm đang vận hành (gọi là **trạm A**). Hãy kiểm tra lại dữ liệu thực tế, sau đó tạo thêm **trạm B có cấu hình vận hành tương tự** để test vận chuyển giữa hai trạm. Sau khi test vận chuyển xong, hướng dẫn tiếp việc trao cứu trợ cho người dân và công bố kết quả trong Campaign.

Hướng dẫn người dùng từng bước bằng Postman/Swagger: đưa đúng endpoint, tài khoản thực hiện, body mẫu theo ID thực tế và kết quả cần kiểm tra. Ghi lại ID sau mỗi bước và kiểm tra kết quả trước khi chuyển bước. Không tự coi các bước trong tài liệu này là đã thực hiện.

## Trạng thái khi bàn giao

- Code nghiệp vụ và Swagger đã commit tại `f9408cb` trên nhánh `TNhan/branch`; chưa push tại thời điểm viết tài liệu này.
- 13 test liên quan đã pass. Các thay đổi/file trong `PassThingsCharity-server/test/` được chủ động để ngoài commit theo yêu cầu người dùng; không stage chúng khi commit tài liệu này.
- Chưa tạo trạm B, chưa chạy kiểm thử vận chuyển thực tế trong phiên này.
- Tất cả 7 trạm trong DB đã được cập nhật `closingTime: "20:00"`. Default model, seed và ví dụ Swagger cũng dùng 20:00. Không chạy seed để chuẩn bị test vì có thể ảnh hưởng dữ liệu đang dùng.
- Chiến dịch đang được người dùng thử: `6aec21afb4145f60ce8239aa`, tên “Chung tay hỗ trợ người dân vùng lũ”. Lần kiểm tra gần nhất: trạng thái `COMPLETED`, chưa gắn trạm. Phải kiểm tra lại vì người dùng có thể đã thay đổi dữ liệu.
- `671000000000000000000015` là ID trạm người dùng đã gửi khi thử gắn trạm, nhưng chưa xác minh đây chính là trạm A đang vận hành. Không tự suy đoán.
- Các thao tác DB trực tiếp trước đây (đổi giờ trạm, xóa bản danh mục mì trùng và lịch sử riêng của nó) không được tái hiện bằng Git pull. Không chạy lại nếu chưa kiểm tra DB đích.

## Chuẩn bị hai trạm

1. Đọc API, Swagger và DB hiện tại để xác định trạm A, quản lý, nhân viên, lịch trực/check-in, tọa độ, tồn kho.
2. Tạo trạm B với ID riêng, có tên phân biệt, địa chỉ và tọa độ phù hợp; giờ hoạt động dự kiến 08:00–20:00. Chuẩn bị quản lý/nhân viên và lịch trực ở B như cấu hình vận hành của A.
3. Không sao chép tồn kho, phiếu, lịch sử hoặc ID của A sang B. Không đổi tài khoản/quyền của nhân sự đang vận hành tùy tiện.
4. Chuẩn bị chiến dịch test phù hợp, danh sách vật phẩm và liên kết trạm. Chiến dịch có sẵn đang COMPLETED không thể quay lại ACTIVE qua API trạng thái; nên tạo chiến dịch test mới nếu cần luồng đang hoạt động.
5. Lập bảng ID/tài khoản: campaignId, trạm A/B, quản lý A/B, nhân viên phụ trách A/B, người vận chuyển, itemTypeId, transferId, transferItemId, taskId, assignmentId, shipmentId. Không ghi token, mật khẩu hoặc giá trị `.env` vào tài liệu/Git.

## Luồng test vận chuyển A → B

Đây là **vận chuyển giữa các trạm**, không phải trao cứu trợ cuối chiến dịch cho người dân. Đọc lại `routes/campaignTransfer.js`, `controller/transferHandover.js`, `services/transferWorkflow.js` và Swagger trước khi đưa body cụ thể; quyền, lịch trực và dữ liệu thực tế phải đáp ứng điều kiện của code.

| Bước | Thao tác | Kết quả cần kiểm tra |
|---|---|---|
| 1 | Kiểm tra hàng ở A và số khả dụng | Đủ hàng cho phiếu; số lượng/đơn vị đúng danh mục |
| 2 | Chuẩn bị ca trực/check-in nhân viên hai đầu | Người thao tác có quyền và đáp ứng lịch trực |
| 3 | `POST /transfers`, từ A sang B | Phiếu đúng chiến dịch và danh sách món; lưu transferId, transferItemId |
| 4 | `PATCH /transfers/{id}/approval` | Duyệt theo quyền; giữ chỗ, chưa trừ tồn thực tế |
| 5 | `PATCH /transfers/{id}/responsibilities` | Có người phụ trách xuất tại A và nhận tại B |
| 6 | Tạo nhiệm vụ vận chuyển gắn với phiếu; ứng tuyển và duyệt hoặc phân công theo luồng hiện có | Task đúng transfer/campaign/trạm nguồn; lấy assignmentId |
| 7 | Người vận chuyển `POST /workforce/tasks/check-in` với assignmentId | Phân công chuyển IN_PROGRESS |
| 8 | `POST /transfers/{id}/shipments` | Gán assignmentId và items gồm transferItemId/quantity; không vượt lượng phiếu |
| 9 | Phụ trách A upload bằng chứng DISPATCH rồi `POST /transfers/{id}/shipments/{shipmentId}/dispatch` | Hàng xuất khỏi A, có lịch sử xuất |
| 10 | Người vận chuyển upload bằng chứng REPORT rồi `POST /transfers/{id}/shipments/{shipmentId}/report` | Khai báo số đã giao; chưa thay xác nhận nhận của B |
| 11 | Phụ trách B upload bằng chứng RECEIVE rồi `POST /transfers/{id}/shipments/{shipmentId}/receive` | Số thực nhận cộng vào B, có lịch sử nhận |
| 12 | Kiểm tra phiếu và kho; người vận chuyển check-out nhiệm vụ | B xác nhận nhận đủ mới hoàn tất nhiệm vụ và xét điểm |

Upload ảnh mỗi bước:

```http
POST /transfers/{id}/shipments/{shipmentId}/evidence/{stage}
```

- Stage là `DISPATCH`, `REPORT`, `RECEIVE`.
- Phải upload bằng đúng tài khoản thực hiện, đúng shipment và stage, rồi dùng URL trả về trong thao tác xác nhận tương ứng.
- REPORT/RECEIVE yêu cầu số lượng từng món theo code hiện tại; số nhận là lũy kế, không phải lượng cộng thêm của lần gọi.
- Đầu B phải được gán người nhận trước khi xuất hàng.
- Không đổi thẳng trạng thái để bỏ qua duyệt/xuất/báo giao/nhận.
- API nhiệm vụ liên quan nằm trong `routes/workforce.js`: đăng ký TNV chiến dịch, ứng tuyển nhiệm vụ, duyệt đơn/phân công, `/workforce/tasks/me`, check-in/check-out. Kiểm tra điều kiện thực tế trước khi chọn luồng ứng tuyển hay phân công trực tiếp.

Các tình huống cần kiểm tra thêm:

- Sai tài khoản hoặc không đúng nhân viên được giao thì bị chặn.
- Không đủ tồn/số khả dụng hoặc phân cho người chở vượt lượng phiếu thì bị chặn.
- Giao thiếu/nhận một phần và nhận bổ sung: đối chiếu lũy kế và tồn kho.
- Gửi xác nhận lặp không cộng/trừ kho hai lần; có thể trả lỗi trạng thái theo thiết kế.
- Người chở không thể hoàn tất nhiệm vụ trước khi B xác nhận đủ tất cả chuyến được giao.
- Đối chiếu kho A, kho B, hàng đang chuyển, lịch sử và điểm người vận chuyển; không chỉ nhìn status.

## Sau vận chuyển: trao cứu trợ cuối chiến dịch

Người dùng muốn ghi rõ **trao cho ai, ở đâu, ngày hoàn tất, đã trao những món nào và bao nhiêu, nhiều ảnh minh chứng**. Không yêu cầu liên kết phiếu vận chuyển giữa trạm vào kết quả.

Phân biệt hai chức năng hiện có:

1. `/distributions`: nghiệp vụ phân phối cứu trợ có danh sách món, người nhận và trạng thái. Đây là luồng liên quan đến xuất kho thực tế; phải kiểm tra/đối chiếu nếu dùng để ghi nhận hàng rời kho trao người dân.
2. `Campaign.results`: báo cáo công khai tổng kết và các đợt trao. Nhập trực tiếp người nhận/vật phẩm/ảnh, không dùng distributionId. Hiện **không tự trừ kho, không tự tạo phiếu phân phối, không cộng/trừ tiến độ quyên góp**.

Không ghi nhận xuất kho hai lần. Trước khi hướng dẫn chạy thật, giải thích rõ hai phần này và kiểm tra số lượng đối chiếu. Không tuyên bố results đã tự đồng bộ với phiếu phân phối: hiện chưa có liên kết đó.

Ngày thực tế hoàn tất trên phiếu phân phối là `completedAt`: chuyển COMPLETED tự ghi giờ hiện tại nếu không truyền; có thể truyền ISO có múi giờ, không ở tương lai; không sửa ngày đã ghi. Phiếu cũ không tự suy diễn ngày thực tế.

## Cập nhật kết quả vào Campaign

### Điều kiện và upload

- Chiến dịch phải `COMPLETED`, người thao tác là ADMIN hoặc người tạo chiến dịch, qua role middleware được phép.
- Chưa có kết quả thì `results: null`.
- Upload trước, lưu URL sau, theo kiểu upload ảnh hiện có:

```http
POST /campaigns/{id}/results/images
```

Gửi multipart/form-data, field `images`, 1–5 file JPEG/PNG/WebP mỗi lần, tối đa 5 MB/file; có thể gọi nhiều lần. Backend nén ảnh. Folder `distribution-evidence`, có thể cấu hình `CLOUDINARY_DISTRIBUTION_EVIDENCE_FOLDER`. Upload chỉ trả URL, chưa lưu vào Campaign. Chưa kiểm thử upload Cloudinary thực tế cho endpoint kết quả trong phiên bàn giao này.

### Lưu toàn bộ kết quả

```http
PATCH /campaigns/{id}/results
```

```json
{
  "summary": "Đã trao nhu yếu phẩm cho các hộ dân bị ảnh hưởng.",
  "images": ["https://res.cloudinary.com/your-cloud/image/upload/overview.jpg"],
  "handovers": [
    {
      "recipientName": "Nguyễn Văn A",
      "recipientRole": "Đại diện các hộ dân",
      "recipientAddress": "Điểm cứu trợ xã A",
      "completedAt": "2026-11-05T09:00:00+07:00",
      "items": [
        { "itemTypeId": "6523456789abcdef00000202", "quantity": 20, "unit": "BOX" }
      ],
      "imageUrls": ["https://res.cloudinary.com/your-cloud/image/upload/handover.jpg"]
    }
  ]
}
```

Đây là ví dụ cấu trúc, thay ID/URL/ngày/số lượng bằng dữ liệu test thật. `handovers` nghĩa là các đợt trao hàng cuối chiến dịch, không phải phiếu vận chuyển.

- Mỗi lần gửi thay thế toàn bộ kết quả: phải gửi lại các đợt/ảnh muốn giữ. Bỏ images/handovers thì các danh sách đó thành rỗng.
- Mỗi đợt bắt buộc người nhận, địa điểm, completedAt thực tế, 1–100 món và ít nhất một ảnh minh chứng.
- Tối đa 100 đợt; mỗi danh sách ảnh tối đa 50 URL không trùng.
- Món phải thuộc cấu hình chiến dịch, đúng đơn vị; số lượng dương tối đa 8 chữ số thập phân. Tổng khai báo trao một món qua mọi đợt không vượt số nhận được xác nhận của chiến dịch.
- Người nhận qua đại diện chỉ chứng minh đại diện đã nhận; không tự kết luận hàng đã đến từng hộ dân nếu không có xác nhận bổ sung.
- `publishedAt`, `updatedAt`, `updatedBy` do backend ghi.

### Kiểm tra hiển thị

```http
GET /campaigns/{id}
```

Kiểm tra `campaign.results`: tổng kết, ảnh tổng kết, từng đợt với người nhận/ngày/địa điểm, items được populate tên và đơn vị, ảnh minh chứng.

`results.itemsSummary` gồm tất cả vật phẩm **đã cấu hình trong chiến dịch**:

- `collectedQuantity`: số nhận xác nhận, từ service tiến độ/quyên góp.
- `handedOverQuantity`: cộng số trao được khai báo trong results.
- `remainingToHandOverQuantity`: số nhận trừ số đã khai báo trao. Đây là phần chưa báo cáo trao, **không phải số tồn kho vật lý**.

Kiểm tra báo cáo này với nghiệp vụ kho/phân phối; nếu cần đồng bộ tự động giữa results và xuất kho thì đó là công việc tiếp theo, không phải tính năng đã hoàn tất.

## Các API Campaign cần tránh nhầm

- `POST /campaigns`: tạo bản nháp DRAFT; thời lượng hiện yêu cầu 5–7 ngày.
- `POST /campaigns/{id}/items`: thêm/cập nhật một mục tiêu vật phẩm (`itemTypeId`, `targetQuantity`, `priority`) mỗi lần.
- `POST /campaigns/{id}/stations`: gắn trạm bằng stationId. Không gửi stationId vào PATCH thông tin chiến dịch.
- `GET /campaigns/{id}` và `GET /campaigns/{id}/stations`: có tên trạm, địa chỉ, latitude, longitude, giờ hoạt động. Tọa độ hiện là chuỗi; FE dùng Number để gọi bản đồ.
- `PATCH /campaigns/{id}`: chỉ title, description, startDate, endDate, imageUrl; sai trường/rỗng trả 400.
- `PATCH /campaigns/{id}/status`: DRAFT → PUBLISHED → ACTIVE → COMPLETED; có nhánh CANCELLED. Hiện không tự chuyển theo ngày, chưa kiểm tra ngày khi chuyển. Sang PUBLISHED/ACTIVE cần ít nhất một trạm hoạt động. Phiếu phân phối có tùy chọn closeCampaign riêng.
- Không tự chuyển chiến dịch test sang COMPLETED quá sớm nếu còn cần thao tác tuyển người/quyên góp/vận chuyển.

## Mốc hoàn tất bàn giao tiếp theo

Sau mỗi giai đoạn, ghi lại endpoint đã gọi, ID, tài khoản theo vai trò (không lưu bí mật), số lượng trước/sau, phản hồi thực tế và bước còn thiếu. Nếu gặp lỗi, đọc lại code và dữ liệu thay vì nhảy trạng thái hoặc sửa kho trực tiếp để vượt điều kiện.
