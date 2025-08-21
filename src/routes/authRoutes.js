const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyPin, verifyToken } = require('../middleware/auth');

// Login with PIN
router.post('/login', verifyPin, authController.login);

// Logout
router.post('/logout', authController.logout);

// Verify authentication status
router.get('/verify', verifyToken, authController.verifyAuth);

module.exports = router;
