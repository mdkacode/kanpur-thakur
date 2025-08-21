const jwt = require('jsonwebtoken');

const authMiddleware = {
  // Verify JWT token
  verifyToken: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
  },

  // Verify PIN and generate token
  verifyPin: (req, res, next) => {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN is required'
      });
    }

    const expectedPin = process.env.LOGIN_PIN || '1234';

    if (pin !== expectedPin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        authenticated: true, 
        timestamp: Date.now() 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    req.authToken = token;
    next();
  }
};

module.exports = authMiddleware;
