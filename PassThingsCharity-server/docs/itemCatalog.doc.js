module.exports = {
  '/catalog/categories': {
    get: {
      tags: ['Catalog'],
      summary: 'Xem danh sách danh mục vật phẩm',
      security: [],
      parameters: [
        { name: 'activeOnly', in: 'query', schema: { type: 'boolean' }, description: 'Lọc chỉ các danh mục đang hoạt động' },
      ],
      responses: {
        200: { description: 'Danh sách danh mục' },
      },
    },
    post: {
      tags: ['Catalog'],
      summary: 'Tạo danh mục vật phẩm mới (Admin / Manager)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemCategoryRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo danh mục thành công' },
      },
    },
  },
  '/catalog/categories/{id}': {
    patch: {
      tags: ['Catalog'],
      summary: 'Cập nhật danh mục vật phẩm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemCategoryUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
    delete: {
      tags: ['Catalog'],
      summary: 'Xóa danh mục vật phẩm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Xóa thành công' },
        409: { description: 'Không thể xóa danh mục còn chứa loại vật phẩm' },
      },
    },
  },
  '/catalog/items': {
    get: {
      tags: ['Catalog'],
      summary: 'Xem danh sách loại vật phẩm chi tiết',
      security: [],
      parameters: [
        { name: 'categoryId', in: 'query', schema: { type: 'string' }, description: 'Lọc theo ID danh mục' },
        { name: 'activeOnly', in: 'query', schema: { type: 'boolean' } },
      ],
      responses: {
        200: { description: 'Danh sách loại vật phẩm' },
      },
    },
    post: {
      tags: ['Catalog'],
      summary: 'Tạo loại vật phẩm chi tiết (Admin / Manager)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemTypeRequest' },
          },
        },
      },
      responses: {
        201: { description: 'Tạo thành công' },
      },
    },
  },
  '/catalog/items/{id}': {
    patch: {
      tags: ['Catalog'],
      summary: 'Cập nhật loại vật phẩm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ItemTypeUpdateRequest' },
          },
        },
      },
      responses: {
        200: { description: 'Cập nhật thành công' },
      },
    },
    delete: {
      tags: ['Catalog'],
      summary: 'Xóa loại vật phẩm',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: { description: 'Xóa thành công' },
        409: { description: 'Không thể xóa loại vật phẩm đang được Campaign sử dụng' },
      },
    },
  },
};
