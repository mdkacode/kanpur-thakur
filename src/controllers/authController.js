const authController = {
  // Login with PIN
  login: async (req, res) => {
    try {
      const token = req.authToken;
      
      // Set token in cookie for better security
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          authenticated: true
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  },

  // Logout
  logout: async (req, res) => {
    try {
      // Clear the token cookie
      res.clearCookie('token');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  },

  // Verify authentication status
  verifyAuth: async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          authenticated: true,
          user: req.user
        }
      });
    } catch (error) {
      console.error('Auth verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Auth verification failed',
        error: error.message
      });
    }
  }
};

module.exports = authController;
