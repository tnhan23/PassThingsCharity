const schemas = require('../docs/schemas.doc');
const authDocs = require('../docs/auth.doc');
const authAdminDocs = require('../docs/authAdmin.doc');
const usersDocs = require('../docs/users.doc');
const organizationsDocs = require('../docs/organizations.doc');
const stationsDocs = require('../docs/stations.doc');
const stationManagerDocs = require('../docs/stationManager.doc');
const adminApprovalDocs = require('../docs/adminApproval.doc');

// BE2 Swagger Docs
const itemCatalogDocs = require('../docs/itemCatalog.doc');
const campaignDocs = require('../docs/campaign.doc');
const gamificationDocs = require('../docs/gamification.doc');

// BE3 Swagger Docs
const operationsDocs = require('../docs/operations.doc');

const createSwaggerDocument = (port = process.env.PORT || 8080) => ({
  openapi: '3.0.0',
  info: {
    title: 'PassThingsCharity API Documentation',
    version: '1.0.0',
    description: 'Tài liệu API chính thức cho hệ thống quyên góp thiện nguyện PassThingsCharity.',
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập token JWT lấy được từ API /auth/login hoặc /authadmin/login (không cần gõ chữ Bearer, Swagger sẽ tự thêm)',
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
    ...authAdminDocs,
    ...usersDocs,
    ...organizationsDocs,
    ...stationsDocs,
    ...stationManagerDocs,
    ...adminApprovalDocs,
    ...itemCatalogDocs,
    ...campaignDocs,
    ...gamificationDocs,
    ...operationsDocs,
  },
});

module.exports = createSwaggerDocument;
