// ✅ routes/userRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const upload = require('../middlewares/multer');


// User routes
router.get('/users', controller.getAllUsers);
router.get('/user/:id', controller.getUserById);
router.put('/user/:id', upload.single('file'), controller.updateUser);
router.post('/upload/multiple/:userId', upload.array('files', 10), controller.uploadFiles);
router.delete('/user/:id', controller.deleteUser);

// File routes
// router.post('/upload/:userId', upload.single('file'), controller.uploadFile); // single file upload
// router.post('/upload/multiple/:userId', upload.array('files', 10), controller.uploadFiles);
// router.get('/user/:id/files', controller.getUserFiles);
// router.put('/user/:userId/files/:fileId', upload.single('file'), controller.updateFile);

module.exports = router;
