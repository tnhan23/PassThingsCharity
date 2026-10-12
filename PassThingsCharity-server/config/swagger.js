const schemas = require('../docs/schemas.doc');
const authDocs = require('../docs/auth.doc');
const usersDocs = require('../docs/users.doc');
const organizationsDocs = require('../docs/organizations.doc');
const stationsDocs = require('../docs/stations.doc');
const stationManagerDocs = require('../docs/stationManager.doc');
const adminApprovalDocs = require('../docs/adminApproval.doc');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'PassThingsCharity API Documentation',
    version: '1.0.0',
    description: 'Tài liệu API chính thức cho hệ thống quyên góp thiện nguyện PassThingsCharity.',
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập token JWT lấy được từ API /auth/login (không cần gõ chữ Bearer, Swagger sẽ tự thêm)',
      },
    },
    schemas,
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    ...authDocs,
    ...usersDocs,
    ...organizationsDocs,
    ...stationsDocs,
    ...stationManagerDocs,
    ...adminApprovalDocs,
  },
};

module.exports = swaggerDocument;
