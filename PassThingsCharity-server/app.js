require('dotenv').config();
const express = require('express');
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

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger');
const app = express();
const mongoose = require('mongoose');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());

// Swagger Documentation
app.use(['/swagger', '/api-docs'], swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.send('PassThingsCharity API is running. View API docs at <a href="/swagger">/swagger</a>');
});

// Existing Route Middlewares
app.use('/auth', authRouter);
app.use('/users', usersRouter);
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

const PORT = process.env.PORT || 8080;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Đã kết nối MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running at: http://localhost:${PORT}`);
      console.log(`📚 Swagger API Docs:  http://localhost:${PORT}/swagger`);
    });
  })
  .catch((error) => {
    console.error('Không kết nối được MongoDB:', error);
    process.exit(1);
  });

module.exports = app;
