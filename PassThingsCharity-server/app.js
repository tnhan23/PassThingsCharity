require('dotenv').config();
const express=require('express');
const passport=require('passport')
require('./config/passport');
const usersRouter=require('./routes/users');
const authRouter=require('./routes/auth');
const organizationsRouter = require('./routes/organization');
const stationsRouter = require('./routes/station');
const adminApprovalRouter = require('./routes/adminApproval');
const stationManagerRouter = require('./routes/stationManager');
const app=express();
const mongoose = require('mongoose');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
app.get('/', (req, res) => {
  res.send('PassThingsCharity API is running');
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/stationmanager', stationManagerRouter);
app.use('/organizations', organizationsRouter);
app.use('/stations', stationsRouter);
app.use('/admin', adminApprovalRouter);
app.use((req, res) => {
  res.status(404).json({ error: 'Không tìm thấy đường dẫn.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Lỗi máy chủ.',
  });
});

const PORT = process.env.PORT ||8080;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Đã kết nối MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Không kết nối được MongoDB:', error);
    process.exit(1);
  });
module.exports = app;