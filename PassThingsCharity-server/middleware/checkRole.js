const checkRole=(allowedRoles)=>{
    return(req,res,next)=>{
        if(!req.user|| !req.user.role){
            return res.status(401).json({error: 'Unauthorized: Không tìm thấy thông tin xác thực.'})  
        }
        const currentUserRole=req.user.role.name;
        if(allowedRoles.includes(currentUserRole)){
            next();
        }
        else{
            res.status(403).json({
                error: `Forbidden: Yêu cầu quyền ${allowedRoles.join(' hoặc ')} để thực hiện hành động này.`
            });
        };
    };
};
module.exports=checkRole;