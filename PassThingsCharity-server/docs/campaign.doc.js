module.exports = {
  '/campaigns': {
    get: {
      tags: ['Campaigns'],
      summary: 'Lấy danh sách các Campaign cứu trợ (Public / Filter)',
      description: 'Mỗi chiến dịch có items và progress: targetQuantity, currentQuantity/collectedQuantity, inTransitQuantity, distributedQuantity, remainingQuantity, progressPercent, isFulfilled. Tổng đã tiếp nhận và số thiếu tính theo phiếu quyên góp của chiến dịch, không lấy kho chung để cộng cho nhiều chiến dịch. Không còn stockQuantity vì hàng trong kho trạm chưa được phân bổ riêng theo chiến dịch. Chuyển trạm và trao cứu trợ không làm tăng/giảm số đã quyên góp.',
      security: [],
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }, description: 'Lọc trạng thái công khai của chiến dịch' },
        { name: 'organizationId', in: 'query', schema: { type: 'string' }, description: 'Lọc theo Tổ chức' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Tìm kiếm theo tên chiến dịch' },
      ],
      responses: {
        200: { description: 'Danh sách Campaign' },
        400: { description: 'Bộ lọc không hợp lệ' },
      },
    },
    post: {
      tags: ['Campaigns'],
      summary: 'Tạo Campaign quyên góp mới (Admin / Station Manager)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo Campaign thành công (DRAFT)' },
        400: { description: 'Dữ liệu không hợp lệ hoặc Campaign không kéo dài từ 120 đến 168 giờ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
      },
    },
  },
  '/campaigns/{id}': {
    get: {
      tags: ['Campaigns'],
      summary: 'Xem chi tiết 1 Campaign (Kèm nhu cầu vật phẩm & các Trạm tiếp nhận)',
      description: 'items trả targetQuantity, collectedQuantity/currentQuantity (quyên góp đã được tiếp nhận cho chiến dịch), inTransitQuantity (đang chuyển theo phiếu chiến dịch), distributedQuantity (đã trao), remainingQuantity (mục tiêu trừ đã tiếp nhận, tối thiểu 0), progressPercent (0–100), isFulfilled. Không trả stockQuantity vì kho dùng chung theo trạm. Muốn xem hàng thực có dùng GET /inventory theo quyền trạm. progress tổng hợp số loại hàng đã đủ, không cộng các đơn vị khác nhau. MongoDB cần hỗ trợ transaction.',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Chi tiết Campaign' },
        404: { description: 'Không tìm thấy chiến dịch công khai' },
      },
    },
    patch: {
      tags: ['Campaigns'],
      summary: 'Chỉnh sửa thông tin Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
        400: { description: 'Dữ liệu không hợp lệ hoặc Campaign không kéo dài từ 120 đến 168 giờ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch' },
      },
    },
  },
  '/campaigns/{id}/status': {
    patch: {
      tags: ['Campaigns'],
      summary: 'Chuyển trạng thái theo luồng DRAFT -> PUBLISHED -> ACTIVE -> COMPLETED hoặc CANCELLED',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'], example: 'PUBLISHED' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã cập nhật trạng thái Campaign' },
        400: { description: 'Trạng thái không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch' },
        409: { description: 'Chuyển trạng thái không hợp lệ' },
      },
    },
  },
  '/campaigns/{id}/items': {
    post: {
      tags: ['Campaigns'],
      summary: 'Cấu hình nhu cầu vật phẩm mục tiêu cho Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CampaignItemRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Đã thêm/cập nhật nhu cầu vật phẩm' },
        400: { description: 'Dữ liệu không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch hoặc loại vật phẩm' },
        409: { description: 'Không thể thêm loại vật phẩm đang ngừng hoạt động' },
      },
    },
  },
  '/campaigns/{id}/items/{itemId}': {
    delete: {
      tags: ['Campaigns'],
      summary: 'Xóa nhu cầu vật phẩm khỏi Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã xóa vật phẩm khỏi Campaign' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy nhu cầu vật phẩm' },
      },
    },
  },
  '/campaigns/{id}/stations': {
    get: {
      tags: ['Campaigns'],
      summary: 'Tra cứu các Trạm tiếp nhận đang hỗ trợ Campaign (Tính khoảng cách gần nhất nếu truyền userLat, userLng)',
      security: [],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'userLat', in: 'query', schema: { type: 'number' }, description: 'Vĩ độ vị trí hiện tại của người dùng (VD: 10.7769)' },
        { name: 'userLng', in: 'query', schema: { type: 'number' }, description: 'Kinh độ vị trí hiện tại của người dùng (VD: 106.7009)' },
      ],
      responses: {
        200: { description: 'Danh sách trạm tiếp nhận kèm khoảng cách kilomet (distanceKm)' },
        404: { description: 'Không tìm thấy chiến dịch công khai' },
      },
    },
    post: {
      tags: ['Campaigns'],
      summary: 'Gán Trạm tiếp nhận tham gia Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['stationId'],
              properties: {
                stationId: { type: 'string', example: '671000000000000000000011' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Đã gán trạm thành công' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy chiến dịch hoặc trạm' },
        409: { description: 'Không thể gán trạm đang ngừng hoạt động' },
      },
    },
  },
  '/campaigns/{id}/stations/{stationId}': {
    delete: {
      tags: ['Campaigns'],
      summary: 'Xóa Trạm tiếp nhận khỏi Campaign',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'stationId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Đã gỡ trạm khỏi Campaign' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền truy cập' },
        404: { description: 'Không tìm thấy trạm đã gán' },
      },
    },
  },
};
// Optional final campaign handovers, entered directly without transport receipts.
const stationResponseSchema = {
  type: 'object', properties: {
    _id: { type: 'string' }, name: { type: 'string' }, address: { type: 'string' },
    latitude: { type: 'string', example: '10.7769', description: 'Vĩ độ; FE dùng Number(latitude) khi gọi bản đồ.' },
    longitude: { type: 'string', example: '106.7009', description: 'Kinh độ; FE dùng Number(longitude) khi gọi bản đồ.' },
    openingTime: { type: 'string' }, closingTime: { type: 'string' }, isActive: { type: 'boolean' },
  },
};
module.exports['/campaigns/{id}'].get.description = (module.exports['/campaigns/{id}'].get.description || '')
  + ' Response có totalStations và stations là các trạm tiếp nhận đang hoạt động đã gắn với chiến dịch, gồm _id, name, address, latitude, longitude, openingTime, closingTime, isActive. Không có trạm thì stations: [], totalStations: 0; không tự chọn trạm thay quản lý.';
module.exports['/campaigns/{id}/stations'].get.responses[200] = {
  description: 'Trạm tiếp nhận đang hoạt động, gồm địa chỉ và tọa độ để FE hiển thị bản đồ.',
  content: { 'application/json': { schema: { type: 'object', properties: {
    campaignId: { type: 'string' }, totalStations: { type: 'integer' }, stations: { type: 'array', items: stationResponseSchema },
  } } } },
};
module.exports['/campaigns/{id}/status'].patch.description = (module.exports['/campaigns/{id}/status'].patch.description || '')
  + ' Chuyển sang PUBLISHED hoặc ACTIVE cần ít nhất một trạm tiếp nhận đang hoạt động đã gắn qua POST /campaigns/{id}/stations; thiếu trạm trả 409.';
const resultsParameters = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];
if (module.exports['/campaigns/{id}']?.get) {
  module.exports['/campaigns/{id}'].get.description = (module.exports['/campaigns/{id}'].get.description || '')
    + ' campaign.results mặc định null. results.handovers là các đợt trao hàng cuối chiến dịch cho người dân/đại diện: recipientName, recipientRole, recipientAddress, completedAt, items (itemTypeId được populate tên/đơn vị, quantity, unit), imageUrls. Nhập trực tiếp, không cần distributionId hay phiếu vận chuyển. results.itemsSummary là bảng tất cả vật phẩm cấu hình trong chiến dịch: collectedQuantity từ quyên góp đã xác nhận, handedOverQuantity cộng các đợt khai báo, remainingToHandOverQuantity là phần chưa báo cáo trao. Đây không phải số tồn kho vật lý. Chưa có kết quả thì results null.';
}
const resultsResponses = {
  200: { description: 'Đã lưu kết quả.' }, 400: { description: 'Dữ liệu hoặc phiếu bàn giao không hợp lệ.' },
  401: { description: 'Chưa đăng nhập.' }, 403: { description: 'Chỉ ADMIN hoặc người tạo chiến dịch được cập nhật.' },
  404: { description: 'Không tìm thấy chiến dịch.' }, 409: { description: 'Chiến dịch chưa COMPLETED.' },
};
module.exports['/campaigns/{id}/results/images'] = { post: {
  tags: ['Campaigns'], summary: 'Upload nhiều ảnh tổng kết hoặc minh chứng bàn giao',
  description: 'Chỉ ADMIN hoặc người tạo, chiến dịch COMPLETED. Giống luồng upload hiện có: upload trước, lấy imageUrls rồi gửi PATCH /campaigns/{id}/results. Chưa tự lưu vào chiến dịch. Folder distribution-evidence, cấu hình CLOUDINARY_DISTRIBUTION_EVIDENCE_FOLDER. Mỗi lần 1–5 ảnh JPEG/PNG/WebP, mỗi ảnh tối đa 5 MB, được nén. Có thể upload nhiều lần. Nếu upload một phần thất bại, response vẫn trả các URL đã thành công.',
  security: [{ bearerAuth: [] }], parameters: resultsParameters,
  requestBody: { required: true, content: { 'multipart/form-data': { schema: {
    type: 'object', required: ['images'], properties: { images: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', format: 'binary' } } },
  } } } },
  responses: { ...resultsResponses, 201: { description: 'Trả images và imageUrls; dùng imageUrls để lưu kết quả.' }, 413: { description: 'Ảnh vượt 5 MB.' }, 502: { description: 'Cloudinary lỗi.' }, 503: { description: 'Chưa cấu hình upload.' } },
} };
module.exports['/campaigns/{id}/results'] = { patch: {
  tags: ['Campaigns'], summary: 'Lưu tổng kết và chi tiết trao hàng cho người dân cuối chiến dịch',
  description: 'results mặc định null. Chỉ ADMIN/người tạo chiến dịch COMPLETED. Nhập trực tiếp người nhận, địa điểm, ngày hoàn tất thực tế, vật phẩm và ảnh minh chứng cho từng đợt; không cần phiếu vận chuyển hoặc distributionId. Gửi toàn bộ kết quả mỗi lần, thay thế nội dung cũ. completedAt bắt buộc, ISO có múi giờ, không ở tương lai. Mỗi đợt có 1–100 món, không trùng món, ít nhất một ảnh; tối đa 100 đợt. Món phải thuộc danh sách chiến dịch, đúng đơn vị, số lượng dương tối đa 8 số lẻ; tổng trao không vượt số đã nhận xác nhận. images là ảnh tổng kết. GET chi tiết trả itemsSummary tổng hợp và populate tên hàng trong từng đợt. publishedAt/updatedAt/updatedBy tự ghi. Đây là báo cáo trao hàng, không tự trừ kho hay cộng/trừ tiến độ quyên góp; không nhập lại chứng từ xuất kho đã ghi nhận.',
  security: [{ bearerAuth: [] }], parameters: resultsParameters,
  requestBody: { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['summary'], properties: {
      summary: { type: 'string', maxLength: 10000 },
      images: { type: 'array', maxItems: 50, uniqueItems: true, items: { type: 'string', format: 'uri' } },
      handovers: { type: 'array', maxItems: 100, items: { type: 'object', required: ['recipientName', 'recipientAddress', 'completedAt', 'items', 'imageUrls'], properties: {
        recipientName: { type: 'string' }, recipientRole: { type: 'string' }, recipientAddress: { type: 'string' },
        completedAt: { type: 'string', format: 'date-time' },
        items: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object', required: ['itemTypeId', 'quantity', 'unit'], properties: {
          itemTypeId: { type: 'string' }, quantity: { type: 'number', exclusiveMinimum: true, minimum: 0 }, unit: { type: 'string', enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'] },
        } } },
        imageUrls: { type: 'array', minItems: 1, maxItems: 50, uniqueItems: true, items: { type: 'string', format: 'uri' } },
      } } },
    },
    example: { summary: 'Đã trao nhu yếu phẩm cho các hộ dân bị ảnh hưởng.', images: ['https://res.cloudinary.com/your-cloud/image/upload/overview.jpg'], handovers: [{ recipientName: 'Nguyễn Văn A', recipientRole: 'Đại diện các hộ dân', recipientAddress: 'Điểm cứu trợ xã A', completedAt: '2026-11-05T09:00:00+07:00', items: [{ itemTypeId: '6523456789abcdef00000202', quantity: 20, unit: 'BOX' }], imageUrls: ['https://res.cloudinary.com/your-cloud/image/upload/handover.jpg'] }] },
  } } } }, responses: resultsResponses,
} };
