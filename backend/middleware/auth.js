const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, type, name }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...allowedTypes) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowedTypes.includes(req.user.type)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { JWT_SECRET, authenticate, authorize };