const passport=require('passport');
require('../config/passport');
const checkBearerToken=passport.authenticate('jwt',{session:false});
module.exports=checkBearerToken;
