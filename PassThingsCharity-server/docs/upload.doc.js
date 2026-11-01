module.exports = {
  '/uploads/{resource}/image': {
    post: {
      tags: ['Image uploads'],
      summary: 'Upload ảnh trước khi tạo bản ghi: trả URL, chưa lưu entity',
      description: 'Yêu cầu đăng nhập. Gửi một file ở field image (JPEG/PNG/WebP, tối đa 5 MB). Backend chọn đúng folder, nén ảnh và chỉ trả một trường URL (avatarUrl/logoUrl/imageUrl/badgeIconUrl). FE gửi URL đó trong JSON đến API tạo tương ứng. Bỏ qua upload nếu chưa muốn thêm ảnh. Nếu bỏ form hoặc tạo thất bại, ảnh đã upload vẫn còn trên Cloudinary. Đăng ký user lần đầu không cần ảnh: đăng ký, đăng nhập rồi cập nhật hồ sơ.',
      parameters: [{ name: 'resource', in: 'path', required: true, schema: {
        type: 'string', enum: ['users', 'organizations', 'stations', 'campaigns', 'item-categories', 'item-types', 'achievements'],
      } }],
      requestBody: { required: true, content: { 'multipart/form-data': { schema: {
        type: 'object', required: ['image'], properties: { image: { type: 'string', format: 'binary' } },
      } } } },
      responses: {
        201: { description: 'Đã upload; gửi URL trong form tạo. Ví dụ organizations trả logoUrl.' },
        400: { description: 'Resource hoặc file không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền tạo loại đối tượng này' },
        413: { description: 'Ảnh vượt 5 MB' },
        422: { description: 'Không thể nén ảnh theo giới hạn' },
        502: { description: 'Lỗi upload Cloudinary' },
        503: { description: 'Chưa cấu hình Cloudinary' },
      },
    },
  },
  '/uploads/{resource}/{id}/image': {
    post: {
      tags: ['Image uploads'],
      summary: 'Thêm/đổi ảnh của bản ghi đã tồn tại và lưu URL trực tiếp',
      description: 'Yêu cầu đăng nhập, role phù hợp và quyền sở hữu bản ghi. User chỉ sửa avatar bản thân; tổ chức kiểm tra submittedBy; chiến dịch/nhóm hàng/loại hàng/thành tích kiểm tra createdBy; trạm cho quản lý được gán hoặc chủ tổ chức. ADMIN có quyền quản trị. Bản ghi danh mục/thành tích cũ không có createdBy chỉ ADMIN được sửa ảnh. Body gửi một file image, JPEG/PNG/WebP tối đa 5 MB. Backend upload và lưu URL cùng imagePublicId trực tiếp; FE không cần gọi API lưu URL lần nữa. Bản ghi chưa có ảnh vẫn dùng API này.',
      parameters: [
        { name: 'resource', in: 'path', required: true, schema: { type: 'string', enum: ['users', 'organizations', 'stations', 'campaigns', 'item-categories', 'item-types', 'achievements'] } },
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: { required: true, content: { 'multipart/form-data': { schema: {
        type: 'object', required: ['image'], properties: { image: { type: 'string', format: 'binary' } },
      } } } },
      responses: {
        200: { description: 'Đã lưu URL ảnh vào bản ghi' },
        400: { description: 'ID, resource hoặc file không hợp lệ' },
        401: { description: 'Chưa đăng nhập' },
        403: { description: 'Không có quyền sửa ảnh' },
        404: { description: 'Bản ghi không tồn tại' },
        413: { description: 'Ảnh vượt 5 MB' },
        422: { description: 'Không thể nén ảnh theo giới hạn' },
        502: { description: 'Lỗi upload Cloudinary' },
        503: { description: 'Chưa cấu hình Cloudinary' },
      },
    },
  },
};

// Publish one named operation per entity, with no resource input in Swagger.
const beforeCreate = module.exports['/uploads/{resource}/image'].post;
const afterCreate = module.exports['/uploads/{resource}/{id}/image'].post;
delete module.exports['/uploads/{resource}/image'];
delete module.exports['/uploads/{resource}/{id}/image'];
for (const [resource, label, field, tag] of [
  ['users', 'avatar người dùng', 'avatarUrl', 'Users'],
  ['organizations', 'logo tổ chức', 'logoUrl', 'Organizations'],
  ['stations', 'ảnh trạm', 'imageUrl', 'Stations'],
  ['campaigns', 'ảnh chiến dịch', 'imageUrl', 'Campaigns'],
  ['item-categories', 'ảnh nhóm hàng', 'imageUrl', 'Catalog'],
  ['item-types', 'ảnh loại hàng', 'imageUrl', 'Catalog'],
  ['achievements', 'ảnh huy hiệu', 'badgeIconUrl', 'Gamification'],
]) {
  const saveEndpoint = {
    users: 'PATCH /users/me/profile', organizations: 'PATCH /organizations/{id}',
    stations: 'PATCH /stations/{id}', campaigns: 'PATCH /campaigns/{id}',
    'item-categories': 'PATCH /catalog/categories/{id}', 'item-types': 'PATCH /catalog/items/{id}',
    achievements: 'PATCH /gamification/achievements/{id}',
  }[resource];
  const response = {
    type: 'object',
    properties: {
      resource: { type: 'string', example: resource },
      field: { type: 'string', example: field },
      [field]: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/your-cloud/image/upload/example.jpg' },
      image: { type: 'object', properties: {
        imageUrl: { type: 'string', format: 'uri' },
        publicId: { type: 'string' },
      } },
    },
  };
  module.exports[`/uploads/${resource}/image`] = { post: {
    ...beforeCreate,
    tags: [tag],
    operationId: `uploadNew_${resource.replace(/-/g, '_')}`,
    summary: resource === 'users' ? 'Upload ảnh lấy avatarUrl cho form cập nhật hồ sơ (chưa lưu database)' : `Upload ${label} lấy ${field} cho form tạo/cập nhật (chưa lưu database)`,
    description: resource === 'users'
      ? 'Dùng khi người dùng chọn ảnh trong form cập nhật hồ sơ và muốn bấm Lưu một lần cho cả ảnh lẫn thông tin.\n\n1. Gửi Bearer token; Body chọn multipart/form-data, key image viết thường, kiểu File. Không cần ID.\n2. API upload file lên Cloudinary rồi trả avatarUrl; chưa thay đổi hồ sơ trong database. FE giữ URL để hiển thị ảnh và gắn vào form.\n3. Khi bấm Lưu hồ sơ, gửi avatarUrl cùng fullName, email, username hoặc phone qua PATCH /users/me/profile. Khi đó mới lưu database.\n\nHủy form thì avatar trong hồ sơ giữ nguyên; file đã upload vẫn còn trên Cloudinary. JPEG/PNG/WebP, tối đa 5 MB. API này không tự cập nhật avatar như POST /uploads/users/{id}/image. Đăng ký tài khoản mới mặc định avatarUrl = null, không cần upload ảnh.'
      : `Dùng trong form tạo hoặc chỉnh sửa. Body → form-data → key image viết thường, kiểu File, kèm Bearer token. API upload Cloudinary và chỉ trả ${field}, không thay đổi bản ghi trong database. FE giữ URL để hiển thị ảnh đã chọn. Khi bấm Lưu: gửi ${field} cùng thông tin vào API tạo hoặc ${saveEndpoint}. Nếu hủy form, dữ liệu bản ghi giữ nguyên nhưng file đã upload vẫn còn trên Cloudinary. Bỏ trường ảnh khi cập nhật để giữ ảnh cũ; null để xóa ảnh. Chỉ người có quyền trên bản ghi được lưu thay đổi ảnh. JPEG/PNG/WebP, tối đa 5 MB.`,
    parameters: [],
    responses: { ...beforeCreate.responses, 201: {
      description: `Upload thành công. Lấy ${field} gắn vào form; gọi ${saveEndpoint} hoặc API tạo tương ứng khi bấm Lưu. Chưa thay đổi bản ghi.`,
      content: { 'application/json': { schema: {
        type: 'object', required: [field], additionalProperties: false,
        properties: { [field]: response.properties[field] },
      } } },
    } },
  } };
  module.exports[`/uploads/${resource}/{id}/image`] = { post: {
    ...afterCreate,
    tags: [tag],
    operationId: `updateImage_${resource.replace(/-/g, '_')}`,
    summary: resource === 'users' ? 'Cập nhật riêng avatar người dùng (lưu database ngay)' : `Thêm/đổi ${label} sau khi tạo — lưu trực tiếp`,
    description: resource === 'users'
      ? 'Dùng cho thao tác đổi avatar độc lập, muốn lưu ngay sau khi chọn ảnh.\n\n1. Nhập ID tài khoản cần đổi avatar và gửi Bearer token. Chỉ chính tài khoản đó hoặc ADMIN được phép đổi.\n2. Body chọn multipart/form-data, key image viết thường, kiểu File. JPEG/PNG/WebP, tối đa 5 MB.\n3. Backend upload lên Cloudinary và cập nhật avatarUrl/imagePublicId vào database ngay, sau đó trả ảnh mới. Không cần gọi PATCH /users/me/profile để lưu ảnh.\n\nKhông dùng API này nếu muốn chờ bấm Lưu hồ sơ mới thay đổi avatar; trường hợp đó dùng POST /uploads/users/image rồi PATCH /users/me/profile. Không cập nhật email, họ tên hoặc số điện thoại bằng API này.'
      : `Nhập ID bản ghi. Body → form-data → key image, kiểu File. Backend lưu ${field} trực tiếp. ` + afterCreate.description,
    parameters: afterCreate.parameters.filter(parameter => parameter.name !== 'resource'),
    responses: { ...afterCreate.responses, 200: {
      description: `Đã cập nhật ${field} vào bản ghi.`,
      content: { 'application/json': { schema: {
        ...response, properties: { ...response.properties, id: { type: 'string' } },
      } } },
    } },
  } };
}
