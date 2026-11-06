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

};

// Publish one named operation per entity, with no resource input in Swagger.
const beforeCreate = module.exports['/uploads/{resource}/image'].post;
delete module.exports['/uploads/{resource}/image'];
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
      ? 'Dùng khi người dùng chọn ảnh trong form cập nhật hồ sơ và muốn bấm Lưu một lần cho cả ảnh lẫn thông tin.\n\n1. Gửi Bearer token; Body chọn multipart/form-data, key image viết thường, kiểu File. Không cần ID.\n2. API upload file lên Cloudinary rồi trả avatarUrl; chưa thay đổi hồ sơ trong database. FE giữ URL để hiển thị ảnh và gắn vào form.\n3. Khi bấm Lưu hồ sơ, gửi avatarUrl cùng fullName, email, username hoặc phone qua PATCH /users/me/profile. Khi đó mới lưu database.\n\nHủy form thì avatar trong hồ sơ giữ nguyên; file đã upload vẫn còn trên Cloudinary. JPEG/PNG/WebP, tối đa 5 MB. Đăng ký tài khoản mới mặc định avatarUrl = null, không cần upload ảnh.'
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
}
