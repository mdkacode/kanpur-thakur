const express = require('express');
const router = express.Router();
const ProcessingSessionController = require('../controllers/processingSessionController');

// Get all processing sessions
router.get('/sessions', ProcessingSessionController.getAllSessions);

// Get session statistics
router.get('/sessions/stats', ProcessingSessionController.getSessionStats);

// Get recent processing activity
router.get('/sessions/activity', ProcessingSessionController.getRecentActivity);

// Get a specific processing session
router.get('/sessions/:sessionId', ProcessingSessionController.getSessionById);

// Create a new processing session
router.post('/sessions', ProcessingSessionController.createSession);

// Add a generated file to a session
router.post('/sessions/:sessionId/files', ProcessingSessionController.addGeneratedFile);

// Update session status
router.put('/sessions/:sessionId/status', ProcessingSessionController.updateSessionStatus);

module.exports = router;
