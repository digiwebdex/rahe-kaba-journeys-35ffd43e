const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is banned
    const userResult = await query('SELECT id, email, full_name, is_banned FROM users WHERE id = $1', [decoded.userId]);
    if (!userResult.rows[0]) return res.status(401).json({ error: 'User not found' });
    if (userResult.rows[0].is_banned) return res.status(403).json({ error: 'Account is suspended' });

    req.user = { id: decoded.userId, email: decoded.email, ...userResult.rows[0] };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    const roleResult = await query('SELECT role FROM user_roles WHERE user_id = $1', [req.user.id]);
    const userRoles = roleResult.rows.map(r => r.role);
    
    if (!roles.some(role => userRoles.includes(role))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    req.userRoles = userRoles;
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await query('SELECT id, email, full_name FROM users WHERE id = $1', [decoded.userId]);
    if (userResult.rows[0]) req.user = userResult.rows[0];
  } catch {}
  next();
};

module.exports = { authenticate, requireRole, optionalAuth };
