const PERMISSIONS = require('../config/permissions');

module.exports = (permission) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const allowedRoles = PERMISSIONS[permission] || [];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        msg: 'غير مصرح',
        required: permission,
        yourRole: userRole,
        allowedRoles
      });
    }
    next();
  };
};