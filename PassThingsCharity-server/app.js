require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('./config/passport');

const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const organizationsRouter = require('./routes/organization');
const stationsRouter = require('./routes/station');
const adminApprovalRouter = require('./routes/adminApproval');
const stationManagerRouter = require('./routes/stationManager');
// BE2 Routers (Catalog, Campaign & Gamification)
const itemCatalogRouter = require('./routes/itemCatalog');
const campaignRouter = require('./routes/campaign');
const gamificationRouter = require('./routes/gamification');

// BE3 Routers (Operations, Transfer, Relief & Workforce)
const contributionsRouter = require('./routes/contribution');
const transfersRouter = require('./routes/campaignTransfer');
const reliefRouter = require('./routes/reliefDistribution');
const workforceRouter = require('./routes/workforce');

const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const createSwaggerDocument = require('./config/swagger');
const app = express();
const mongoose = require('mongoose');

const DEFAULT_PORT = Number(process.env.PORT) || 8080;
const swaggerDocument = createSwaggerDocument(DEFAULT_PORT);
const swaggerEnabled = !process.env.RENDER;

app.set('trust proxy', 1);
app.use(cors());
const captureRawBody = (req, res, buf) => {
  if (buf?.length) req.rawBody = Buffer.from(buf);
};
app.use(express.json({ verify: captureRawBody }));
app.use(express.urlencoded({ extended: false, verify: captureRawBody }));
app.use(passport.initialize());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn thử quá nhiều lần. Đợi một lát rồi thử lại.' },
});
const { requireAppAttest } = require('./middleware/requireAppAttest');
const { requireAppSignature } = require('./middleware/requireAppSignature');
app.use(requireAppSignature);
app.use(requireAppAttest);

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use('/auth/forgot-password', authLimiter);
app.use('/auth/reset-password', authLimiter);

if (swaggerEnabled) {
  app.use(['/swagger', '/api-docs'], swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.get('/', (req, res) => {
  res.send(swaggerEnabled
    ? 'PassThingsCharity API is running. View API docs at <a href="/swagger">/swagger</a>'
    : 'PassThingsCharity API is running.');
});

// Existing Route Middlewares
app.use('/app-attest', require('./routes/appAttest'));
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/uploads', require('./routes/upload'));
app.use('/stationmanager', stationManagerRouter);
app.use('/organizations', organizationsRouter);
app.use('/stations', stationsRouter);
app.use('/admin', adminApprovalRouter);

// BE2 Route Middlewares
app.use('/catalog', itemCatalogRouter);
app.use('/campaigns', campaignRouter);
app.use('/gamification', gamificationRouter);

// BE3 Route Middlewares
app.use('/contributions', contributionsRouter);
app.use('/transfers', transfersRouter);
app.use('/relief', reliefRouter);
app.use('/workforce', workforceRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Không tìm thấy đường dẫn.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Lỗi máy chủ.',
  });
});

const startServer = (port) => {
  const server = app.listen(port, "0.0.0.0", () => {
    process.env.PORT = String(port);
    swaggerDocument.servers[0].url = `http://localhost:${port}`;
    console.log(`Server running at: http://localhost:${port}`);
    if (swaggerEnabled) console.log(`Swagger API Docs: http://localhost:${port}/swagger`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on port ${fallbackPort}...`);
      startServer(fallbackPort);
      return;
    }

    console.error('Server failed to start:', error);
    process.exit(1);
  });
};

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Đã kết nối MongoDB');
    startServer(DEFAULT_PORT);
  })
  .catch((error) => {
    console.error('Không kết nối được MongoDB:', error);
    process.exit(1);
  });

module.exports = app;
