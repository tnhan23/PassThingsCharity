const User=require('../models/user');
const Role=require('../models/role');
const mongoose  = require('mongoose');
const bcrypt = require('bcryptjs');

async function getUser(req,res,next){
    try{
    const filter={};
    if(req.query.role){
        const roleName=String(req.query.role).toUpperCase();
        const role=await Role.findOne({name:roleName});
        if(!role){
            return res.status(400).json({ error: 'Role không hợp lệ.' });

        }
          filter.role = role._id;
    }
    const users=await User.find(filter).populate('role','name');
    return res.status(200).json({data:users});

}catch(error){
    next(error);
}
};
async function createUser(req,res,next) {
    try{
          const {email,username,password,fullName,phone}=req.body || {};
               if(
                 !mongoose.isValidObjectId(stationId) ||
               typeof email !== 'string' || !email.trim() ||
               typeof username !== 'string' || !username.trim() ||
               typeof password !== 'string' || !password ||
               typeof fullName !== 'string' || !fullName.trim() ||
               typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())
               )
               {
                 return res.status(400).json({
                 error: 'Thông tin không hợp lệ; phone phải gồm đúng 10 chữ số.',
                 })
             }
             const userRole = await Role.findOne({ name: 'USER' });

             if (!userRole) {
               return res.status(500).json({
            error: 'Chưa cấu hình role USER trong hệ thống.',
            });
               }
               const user=await User.create({
                    email: email.trim().toLowerCase(),
                    username: username.trim(),
                    password: await bcrypt.hash(password, 12),
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    role: userRole._id,
                  });
                 return res.status(201).json({
                message: 'Đã tạo tài khoản USER.',
      user: {
        id: user._id,
        username: staff.username,
        fullName: staff.fullName,
        role: 'USER',
        status:user.status,
      },
    });  



    }catch(error){
       if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email hoặc username đã được sử dụng.',
      });
    }
    return next(error);     
    }
    
}
async function deleteUser(req,res,next){
    try{
        const {id}=req.params;
       if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }
    const user=await User.findByIdAndUpdate(
        id,
        {status:'inactive'},
        {new:true,runValidators:true}
    ).populate('role','name');
    if(!user){
        return res.status(404).json({error: 'Không tìm thấy user.'})
    }
    return res.status(200).json({
        message:'Đã vô hiệu hóa tài khoản',
        user:{
            id:user._id,
            username:user.username,
            role:user.role?.name,
            status:user.status,
        }
    })

    }catch (error) {
    return next(error);
    }
}
async function updateUser(req,res,next) {
    try{
         const {id}=req.params;
            if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'User ID không hợp lệ.' });
    }
    if (
      email === undefined &&
      username === undefined &&
      fullName === undefined &&
      phone === undefined &&
      status === undefined &&
      password === undefined
    ) {
      return res.status(400).json({
        error: 'Cần gửi ít nhất một thông tin cần cập nhật.',
      });
    }

    if (email !== undefined &&
        (typeof email !== 'string' || !email.trim())) {
      return res.status(400).json({ error: 'Email không hợp lệ.' });
    }

    if (username !== undefined &&
        (typeof username !== 'string' || !username.trim())) {
      return res.status(400).json({ error: 'Username không hợp lệ.' });
    }

    if (fullName !== undefined &&
        (typeof fullName !== 'string' || !fullName.trim())) {
      return res.status(400).json({ error: 'Họ tên không hợp lệ.' });
    }

    if (phone !== undefined &&
        (typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim()))) {
      return res.status(400).json({
        error: 'Phone phải gồm đúng 10 chữ số.',
      });
    }

    if (
      status !== undefined &&
      !['active', 'inactive', 'banned'].includes(status)
    ) {
      return res.status(400).json({
        error: 'Status phải là active, inactive hoặc banned.',
      });
    }

    if (password !== undefined &&
        (typeof password !== 'string' || !password)) {
      return res.status(400).json({ error: 'Password không hợp lệ.' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user.' });
    }

    if (email !== undefined) {
      user.email = email.trim().toLowerCase();
    }
    if (username !== undefined) {
      user.username = username.trim();
    }
    if (fullName !== undefined) {
      user.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      user.phone = phone.trim();
    }
    if (status !== undefined) {
      user.status = status;
    }
    if (password !== undefined) {
      user.password = await bcrypt.hash(password, 12);
    }
    await user.save();
    await user.populate('role','name')
    return res.status(200).json({
        message:'Đã cập nhật tài khoản',
        user:{
            id:user._id,
            email:user.email,
            username:user.username,
            fullName:user.fullName,
            phone:user,phone,
            role:user.role?.name,
            status:user.status,
        },
    })

    }catch(error){
     if (error.code === 11000) {
      return res.status(409).json({
        error: 'Email hoặc username đã được sử dụng.',
      });
    }
     return next(error);
    }
    
}

module.exports={getUser,createUser,deleteUser,updateUser}