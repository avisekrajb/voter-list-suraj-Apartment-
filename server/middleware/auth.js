const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return res.status(401).json({ error: 'Authentication required - No token provided' });
    }
    
    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid token format - expected Bearer token');
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      console.log('Empty token after Bearer removal');
      return res.status(401).json({ error: 'Authentication required - Empty token' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const validateAdmin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

module.exports = { auth, validateAdmin };