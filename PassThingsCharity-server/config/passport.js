const passport=require('passport')
const {Strategy:JwtStrategy,ExtractJwt}=require('passport-jwt')
const User=require('../models/user');
const options={
    jwtFromRequest:ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey:process.env.JWT,
};
passport.use(
    new JwtStrategy(options,async(jwtPayload,done)=>{
        try{
              const user=await User.findById(jwtPayload.userId).populate('role');
              if(!user||user.status !=='active'){
                return done(null,false)
              }
              return done(null,user)
        }catch(error){
            return done(error,false)
        }
    })
);
module.exports=passport
