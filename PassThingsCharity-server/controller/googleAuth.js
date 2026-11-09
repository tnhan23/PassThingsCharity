const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Role = require('../models/role');
const Station = require('../models/station');
const StationStaff = require('../models/stationstaff');
const Admin = require('../models/admin');
const { sendMail } = require('../utils/mailer');

// In-memory store for pending Gmail registration OTPs (for emails not yet in DB)
const pendingGmailOtps = new Map();

function normalizeEmail(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function isValidGmail(email) {
  return /^[a-zA-Z0-9._%+-]+@(gmail\.com|googlemail\.com|[a-zA-Z0-9.-]+\.edu\.vn)$/i.test(email);
}

async function generateUniqueUsername(email, preferredUsername) {
  const baseRaw = (typeof preferredUsername === 'string' && preferredUsername.trim())
    ? preferredUsername.trim()
    : email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
  const base = baseRaw || 'gmail_user';

  let candidate = base;
  let counter = 1;
  while (await User.exists({ username: candidate }) || await Admin.exists({ username: candidate })) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }
  return candidate;
}

async function buildAuthResponse(account, isAdmin = false, extraMessage = undefined) {
  const role = isAdmin ? 'ADMIN' : (account.role?._id || account.role || 'USER');
  const roleDocument = !isAdmin && account.role
    ? (account.role.name ? account.role : await Role.findById(account.role).select('name'))
    : null;
  const roleName = isAdmin ? 'ADMIN' : (roleDocument?.name || 'USER');

  let stations = [];
  const stationFields = '_id name address organizationId managerId imageUrl latitude longitude openingTime closingTime isActive';
  if (roleName === 'STATION_MANAGER') {
    stations = await Station.find({ managerId: account._id }).select(stationFields).sort({ _id: 1 }).lean();
  } else if (roleName === 'STAFF') {
    const stationIds = await StationStaff.distinct('stationId', { userId: account._id });
    stations = await Station.find({ _id: { $in: stationIds } }).select(stationFields).sort({ _id: 1 }).lean();
  }

  const token = jwt.sign(
    { userId: account._id.toString(), role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    ...(extraMessage ? { message: extraMessage } : {}),
    token,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: account._id,
      email: account.email || null,
      username: account.username,
      fullName: account.fullName || null,
      avatarUrl: account.avatarUrl || null,
      phone: account.phone || null,
      role,
      stations,
    },
  };
}

/**
 * Verify Google idToken or accessToken against Google's official OAuth2 endpoints
 */
async function verifyGoogleToken( { idToken, accessToken }) {
  if (typeof idToken === 'string' && idToken.trim()) {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await response.json();
    if (!response.ok || !data.email) {
      throw Object.assign(new Error('Google idToken không hợp lệ hoặc đã hết hạn.'), { status: 401 });
    }
    if (process.env.GOOGLE_CLIENT_ID && data.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw Object.assign(new Error('Google idToken không thuộc ứng dụng này (sai Client ID).'), { status: 401 });
    }
    return {
      googleId: data.sub,
      email: normalizeEmail(data.email),
      fullName: data.name || data.given_name || data.email.split('@')[0],
      avatarUrl: data.picture || null,
      emailVerified: data.email_verified === 'true' || data.email_verified === true,
    };
  }

  if (typeof accessToken === 'string' && accessToken.trim()) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (!response.ok || !data.email) {
      throw Object.assign(new Error('Google accessToken không hợp lệ hoặc đã hết hạn.'), { status: 401 });
    }
    return {
      googleId: data.sub,
      email: normalizeEmail(data.email),
      fullName: data.name || data.given_name || data.email.split('@')[0],
      avatarUrl: data.picture || null,
      emailVerified: Boolean(data.email_verified),
    };
  }

  return null;
}

/**
 * 1. POST /auth/google/send-otp
 * Kế thừa cấu hình Gmail (MAIL_USER / MAIL_PASS) của tính năng Quên mật khẩu:
 * - Nếu mode = 'login': Kiểm tra Gmail trong DB trước. Nếu không tồn tại -> Báo lỗi 404 "Tài khoản Gmail này không tồn tại trong hệ thống".
 * - Nếu mode = 'register': Gửi mã OTP 6 chữ số về Gmail để xác thực và bắn thẳng tài khoản mới vào DB ở bước verify.
 */
async function sendGmailOtp(req, res, next) {
  try {
    const { email: rawEmail, mode = 'login' } = req.body || {};
    const email = normalizeEmail(rawEmail);

    if (!email || !isValidGmail(email)) {
      return res.status(400).json({
        error: 'Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com).',
      });
    }

    const normalizedMode = String(mode).trim().toLowerCase();
    const existingUser = await User.findOne({ email });

    if (normalizedMode === 'login') {
      if (!existingUser) {
        return res.status(404).json({
          error: 'Tài khoản Gmail này không tồn tại trong hệ thống. Vui lòng đăng ký tài khoản trước.',
        });
      }
      if (existingUser.status !== 'active') {
        return res.status(401).json({
          error: 'Tài khoản Gmail này đã bị khóa hoặc ngừng hoạt động.',
        });
      }
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (existingUser) {
      existingUser.resetPasswordToken = hashedOtp;
      existingUser.resetPasswordExpires = expiresAt;
      await existingUser.save();
    } else {
      pendingGmailOtps.set(email, { hashedOtp, expiresAt });
    }

    try {
      await sendMail(
        email,
        normalizedMode === 'register'
          ? 'Mã xác thực đăng ký bằng Gmail - PassThingsCharity'
          : 'Mã OTP đăng nhập bằng Gmail - PassThingsCharity',
        `<p>Chào bạn,</p>
         <p>Mã OTP ${normalizedMode === 'register' ? 'đăng ký và kích hoạt' : 'đăng nhập'} tài khoản Gmail <b>${email}</b> của bạn là: <b style="font-size: 18px; color: #2563eb;">${otp}</b></p>
         <p>Mã này có hiệu lực trong vòng <b>10 phút</b>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>`
      );
    } catch (mailError) {
      return res.status(400).json({
        error: 'Không thể gửi email tới địa chỉ Gmail này. Vui lòng kiểm tra lại Gmail có tồn tại thật hay không.',
      });
    }

    return res.status(200).json({
      message: existingUser
        ? 'Đã gửi mã OTP đăng nhập tới Gmail của bạn. Vui lòng kiểm tra hộp thư.'
        : 'Đã gửi mã OTP xác thực tới Gmail của bạn. Nhập OTP để tạo tài khoản vào hệ thống.',
      email,
      isExistingUser: Boolean(existingUser),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * 2. POST /auth/google/verify-otp
 * Xác thực mã OTP từ Gmail:
 * - Nếu tài khoản Gmail đã có trong DB -> Đăng nhập ngay, trả về JWT token.
 * - Nếu tài khoản Gmail chưa có trong DB -> Tạo mới User bắn thẳng vào DB (mặc định role USER) và trả về JWT token!
 */
async function verifyGmailOtp(req, res, next) {
  try {
    const { email: rawEmail, otp, fullname, fullName, username, password, phone, avatarUrl } = req.body || {};
    const email = normalizeEmail(rawEmail);

    if (!email || !isValidGmail(email) || typeof otp !== 'string' || !otp.trim()) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp địa chỉ Gmail và mã OTP 6 chữ số hợp lệ.',
      });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    let user = await User.findOne({ email }).select('+password +resetPasswordToken +resetPasswordExpires');

    if (user) {
      if (!user.resetPasswordToken || user.resetPasswordToken !== hashedOtp || !user.resetPasswordExpires || user.resetPasswordExpires <= Date.now()) {
        return res.status(400).json({ error: 'Mã OTP không đúng hoặc đã hết hạn.' });
      }
      if (user.status !== 'active') {
        return res.status(401).json({ error: 'Tài khoản Gmail này đã bị khóa.' });
      }
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(200).json(
        await buildAuthResponse(user, false, 'Đăng nhập bằng Gmail thành công.')
      );
    }

    // Chưa có trong DB -> Kiểm tra OTP trong pendingGmailOtps để tạo mới bắn thẳng vào DB
    const pending = pendingGmailOtps.get(email);
    if (!pending || pending.hashedOtp !== hashedOtp || pending.expiresAt <= Date.now()) {
      return res.status(400).json({
        error: 'Mã OTP không đúng, đã hết hạn hoặc tài khoản Gmail này chưa yêu cầu mã xác thực.',
      });
    }
    pendingGmailOtps.delete(email);

    const roleDoc = await Role.findOne({ name: 'USER' });
    if (!roleDoc) {
      return res.status(500).json({ error: 'Chưa cấu hình role USER trong hệ thống.' });
    }

    const finalUsername = await generateUniqueUsername(email, username);
    const finalFullName = (typeof (fullname || fullName) === 'string' && (fullname || fullName).trim())
      ? (fullname || fullName).trim()
      : email.split('@')[0];
    const finalPhone = (typeof phone === 'string' && /^\d{10}$/.test(phone.trim()))
      ? phone.trim()
      : '0000000000';
    const rawPass = (typeof password === 'string' && password.length >= 6)
      ? password
      : crypto.randomBytes(4).toString('hex');

    user = await User.create({
      avatarUrl: typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null,
      email,
      username: finalUsername,
      password: await bcrypt.hash(rawPass, 12),
      fullName: finalFullName,
      phone: finalPhone,
      role: roleDoc._id,
      status: 'active',
    });

    sendMail(
      user.email,
      'Thông tin tài khoản & mật khẩu - PassThingsCharity',
      `<p>Xin chào <b>${user.fullName}</b>,</p>
       <p>Tài khoản Gmail <b>${user.email}</b> của bạn đã được tạo thành công trên hệ thống PassThingsCharity.</p>
       <p>Thông tin đăng nhập của bạn:</p>
       <ul>
         <li><b>Gmail / Email:</b> ${user.email}</li>
         <li><b>Username:</b> ${user.username}</li>
         <li><b>Mật khẩu đăng nhập:</b> <span style="font-size: 16px; color: #2563eb; font-weight: bold;">${rawPass}</span></li>
       </ul>
       <p>Bạn có thể dùng mật khẩu này để đăng nhập trực tiếp lần sau hoặc đổi lại trong mục Đổi mật khẩu.</p>`
    ).catch(() => {});

    return res.status(201).json(
      await buildAuthResponse(user, false, 'Đăng ký và đăng nhập bằng Gmail thành công (đã lưu vào Database).')
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email hoặc username đã được sử dụng.' });
    }
    return next(error);
  }
}

/**
 * 3. POST /auth/google
 * Endpoint tổng hợp cho Đăng nhập / Đăng ký bằng Google (Gmail):
 * - Trường hợp 1: Gửi Google `idToken` hoặc `accessToken` -> Xác thực với Google. Nếu chưa có trong DB thì tự tạo User bắn thẳng vào DB (trừ khi autoRegister=false thì báo 404 không tồn tại).
 * - Trường hợp 2: Gửi `email` (Gmail) + `password` kèm `mode: 'register'` -> Tạo tài khoản Gmail mới bắn thẳng vào DB + gửi mail thông báo qua Gmail SMTP và trả về JWT token luôn.
 * - Trường hợp 3: Gửi `email` (Gmail) + `password` (mặc định `mode: 'login'`) -> Kiểm tra Gmail trong DB:
 *     + Nếu Gmail không tồn tại trong DB -> Báo lỗi 404: "Tài khoản Gmail này không tồn tại trong hệ thống. Vui lòng đăng ký trước."
 *     + Nếu tồn tại và đúng mật khẩu -> Trả về JWT token đăng nhập.
 */
async function googleLoginOrRegister(req, res, next) {
  try {
    const body = req.body || {};
    const {
      idToken,
      accessToken,
      email: rawEmail,
      password,
      fullname,
      fullName,
      username,
      phone,
      avatarUrl,
      mode,
      autoRegister = true,
    } = body;

    // LUỒNG 1: Xác thực bằng Google OAuth Token (idToken / accessToken)
    if (idToken || accessToken) {
      const googleProfile = await verifyGoogleToken({ idToken, accessToken });
      let user = await User.findOne({ email: googleProfile.email });

      if (!user) {
        if (autoRegister === false || String(mode).toLowerCase() === 'login_only') {
          return res.status(404).json({
            error: 'Tài khoản Gmail này không tồn tại trong hệ thống. Vui lòng đăng ký tài khoản trước.',
          });
        }
        const roleDoc = await Role.findOne({ name: 'USER' });
        if (!roleDoc) {
          return res.status(500).json({ error: 'Chưa cấu hình role USER trong hệ thống.' });
        }
        const finalUsername = await generateUniqueUsername(googleProfile.email, username);
        const finalPhone = (typeof phone === 'string' && /^\d{10}$/.test(phone.trim()))
          ? phone.trim()
          : '0000000000';
        const rawPass = (typeof password === 'string' && password.length >= 6)
          ? password
          : crypto.randomBytes(4).toString('hex');
        const randomPassword = await bcrypt.hash(rawPass, 12);

        user = await User.create({
          googleId: googleProfile.googleId || null,
          avatarUrl: googleProfile.avatarUrl || null,
          email: googleProfile.email,
          username: finalUsername,
          password: randomPassword,
          fullName: googleProfile.fullName,
          phone: finalPhone,
          role: roleDoc._id,
          status: 'active',
        });

        // Gửi email chào mừng kèm mật khẩu (kế thừa mailer của tính năng 2, không chặn luồng nếu lỗi mạng)
        sendMail(
          user.email,
          'Chào mừng bạn đến với PassThingsCharity - Thông tin mật khẩu',
          `<p>Xin chào <b>${user.fullName}</b>,</p>
           <p>Tài khoản Gmail <b>${user.email}</b> của bạn đã được tạo thành công trên hệ thống PassThingsCharity.</p>
           <p>Thông tin đăng nhập của bạn:</p>
           <ul>
             <li><b>Gmail / Email:</b> ${user.email}</li>
             <li><b>Username:</b> ${user.username}</li>
             <li><b>Mật khẩu đăng nhập:</b> <span style="font-size: 16px; color: #2563eb; font-weight: bold;">${rawPass}</span></li>
           </ul>
           <p>Bạn có thể dùng mật khẩu này để đăng nhập trực tiếp lần sau hoặc đổi lại trong mục Đổi mật khẩu.</p>`
        ).catch(() => {});

        return res.status(201).json(
          await buildAuthResponse(user, false, 'Đăng ký bằng tài khoản Google thành công (đã lưu vào Database).')
        );
      }

      if (user.status !== 'active') {
        return res.status(401).json({ error: 'Tài khoản Gmail này đã bị khóa.' });
      }
      if (googleProfile.googleId && !user.googleId) {
        user.googleId = googleProfile.googleId;
      }
      if (googleProfile.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = googleProfile.avatarUrl;
      }
      await user.save();

      return res.status(200).json(
        await buildAuthResponse(user, false, 'Đăng nhập bằng Google thành công.')
      );
    }

    // LUỒNG 2 & 3: Đăng nhập hoặc Đăng ký trực tiếp bằng địa chỉ Gmail
    const email = normalizeEmail(rawEmail);
    if (!email || !isValidGmail(email)) {
      return res.status(400).json({
        error: 'Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com).',
      });
    }

    const isRegisterMode = String(mode || '').trim().toLowerCase() === 'register';

    if (isRegisterMode) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu tối thiểu 6 ký tự.' });
      }
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'Tài khoản Gmail này đã tồn tại trong hệ thống. Vui lòng chuyển sang đăng nhập.' });
      }
      const roleDoc = await Role.findOne({ name: 'USER' });
      if (!roleDoc) {
        return res.status(500).json({ error: 'Chưa cấu hình role USER trong hệ thống.' });
      }

      const finalUsername = await generateUniqueUsername(email, username);
      const finalFullName = (typeof (fullname || fullName) === 'string' && (fullname || fullName).trim())
        ? (fullname || fullName).trim()
        : email.split('@')[0];
      const finalPhone = (typeof phone === 'string' && /^\d{10}$/.test(phone.trim()))
        ? phone.trim()
        : '0000000000';

      const newUser = await User.create({
        avatarUrl: typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : null,
        email,
        username: finalUsername,
        password: await bcrypt.hash(password, 12),
        fullName: finalFullName,
        phone: finalPhone,
        role: roleDoc._id,
        status: 'active',
      });

      sendMail(
        newUser.email,
        'Đăng ký tài khoản Gmail thành công - PassThingsCharity',
        `<p>Xin chào <b>${newUser.fullName}</b>,</p>
         <p>Bạn đã đăng ký thành công tài khoản bằng Gmail <b>${newUser.email}</b> trên hệ thống PassThingsCharity.</p>
         <p>Thông tin đăng nhập của bạn:</p>
         <ul>
           <li><b>Gmail / Email:</b> ${newUser.email}</li>
           <li><b>Username:</b> ${newUser.username}</li>
           <li><b>Mật khẩu đăng nhập:</b> <span style="font-size: 16px; color: #2563eb; font-weight: bold;">${password}</span></li>
         </ul>`
      ).catch(() => {});

      return res.status(201).json(
        await buildAuthResponse(newUser, false, 'Đăng ký bằng Gmail thành công (đã lưu thẳng vào Database).')
      );
    }

    // Mặc định: Đăng nhập bằng Gmail
    let account = await User.findOne({ email }).select('+password');
    let isAdmin = false;
    if (!account) {
      account = await Admin.findOne({ email }).select('+password');
      isAdmin = true;
    }

    if (!account) {
      return res.status(404).json({
        error: 'Tài khoản Gmail này không tồn tại trong hệ thống. Vui lòng kiểm tra lại hoặc đăng ký tài khoản trước.',
      });
    }

    if (!isAdmin && account.status !== 'active') {
      return res.status(401).json({
        error: 'Tài khoản Gmail này đã bị khóa.',
      });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({
        error: 'Vui lòng nhập mật khẩu hoặc sử dụng chức năng gửi mã OTP qua Gmail (/auth/google/send-otp).',
      });
    }

    const passwordMatches = await bcrypt.compare(password, account.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác.' });
    }

    return res.status(200).json(
      await buildAuthResponse(account, isAdmin, 'Đăng nhập bằng Gmail thành công.')
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email hoặc username đã được sử dụng.' });
    }
    return next(error);
  }
}

module.exports = {
  googleLoginOrRegister,
  sendGmailOtp,
  verifyGmailOtp,
};

