const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

// GET /api/admin/users?page=1&limit=20&search=...
router.get('/users', adminAuth, adminController.getAllUsers);

// GET /api/admin/users/:id
router.get('/users/:id', adminAuth, adminController.getUserById);

module.exports = router;
