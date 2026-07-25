const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { auth, validateAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Admin login route
router.post('/admin/login', validateAdmin, (req, res) => {
  try {
    const token = jwt.sign(
      { email: process.env.ADMIN_EMAIL, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ 
      token, 
      email: process.env.ADMIN_EMAIL,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== PUBLIC ROUTES ====================
// No authentication required
router.get('/voters', voterController.getAllVoters);
router.get('/voters/search', voterController.searchVoters);

// ==================== ADMIN ROUTES ====================
// Authentication required - All routes must have auth middleware

// IMPORTANT: SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES
// File-wise data route - MUST be before /voters/:sn to avoid conflict
router.get('/voters/file-wise', auth, voterController.getFileWiseData);

// Upload routes
router.post('/voters', auth, voterController.createVoters);
router.post('/voters/upload-folder', auth, voterController.uploadFolder);

// Parameterized routes - MUST come after specific routes
router.get('/voters/:sn', voterController.getVoter);

// CRUD routes
router.put('/voters/:sn', auth, voterController.updateVoter);
router.delete('/voters/:sn', auth, voterController.deleteVoter);
router.delete('/voters', auth, voterController.deleteAllVoters);
router.post('/voters/delete-multiple', auth, voterController.deleteMultipleVoters);

// Stats route
router.get('/stats', auth, voterController.getStats);

// Test route for debugging
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;