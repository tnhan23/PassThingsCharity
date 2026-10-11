const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Role=require('../models/role')
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Vui lòng nhập username và password.',
      });
    }

    const user = await User.findOne({ username }).select('+password');

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Sai thông tin đăng nhập.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Sai thông tin đăng nhập.' });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: 3600,
       user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
}
async function register(req,res,next){
  try{
    const body=req.body ||{};
    const{email,username,password,fullname,phone}=body;
   if( typeof email !== 'string' || !email.trim() ||
      typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password ||
      typeof fullname !== 'string' || !fullname.trim()||
      typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())
    ){
       return res.status(400).json({
        error: 'Vui lòng nhập email, username, password và fullname.',
      });
    }
    const role=await Role.findOne({name:'USER'});
    if (!role) {
      return res.status(500).json({
        error: 'Chưa cấu hình role USER trong hệ thống.',
      });
    }
    const user= await User.create({
      email:email.trim().toLowerCase(),
      username:username.trim(),
      password: await bcrypt.hash(password,12),
      fullname:fullname.trim(),
      phone:phone.trim(),
      role:role._id
    });
    return res.status(201).json({
      message: 'Đăng ký thành công.',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        fullname: user.fullname,
        phone:user.phone,
        role: 'USER'
      },
    })
  }catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email hoặc username đã được sử dụng.',
      });
    }
    return next(error);
  }
}

module.exports = { login,register };
