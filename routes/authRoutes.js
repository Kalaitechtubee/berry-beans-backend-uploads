// ✅ routes/authRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const upload = require('../middlewares/multer');

// Auth routes
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);