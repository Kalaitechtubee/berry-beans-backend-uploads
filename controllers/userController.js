
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, UserFile } = require('../models');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Register
exports.register = async (req, res) => {
  try {
    const {
      name, email, password, phone,
      location, companyName, position,
      customerId, joinDate, status = 'active'
    } = req.body;

    if (!name || !email || !password || !phone || !location || !companyName || !position || !customerId) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ msg: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalJoinDate = joinDate || new Date().toISOString().slice(0, 10);

    await User.create({
      name, email, password: hashedPassword, phone,
      location, companyName, position, customerId,
      joinDate: finalJoinDate, status
    });

    res.json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error('🛑 Sequelize Error:', err.errors || err);
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

// ✅ Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ msg: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

// ✅ Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    const expireTime = new Date(Date.now() + 15 * 60 * 1000);

    const [updated] = await User.update(
      { resetPasswordToken: resetToken, resetPasswordExpire: expireTime },
      { where: { email } }
    );

    if (updated === 0) return res.status(404).json({ msg: 'Email not found' });

    res.json({ msg: 'Reset token generated', resetToken });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

// ✅ Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpire: { [Op.gt]: new Date() }
      }
    });

    if (!user) return res.status(400).json({ msg: 'Invalid or expired token' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword, resetPasswordToken: null, resetPasswordExpire: null });

    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      name,
      email,
      phone,
      location,
      companyName,
      position,
      customerId,
      joinDate,
      status
    } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = {};

    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (email) whereClause.email = { [Op.like]: `%${email}%` };
    if (phone) whereClause.phone = { [Op.like]: `%${phone}%` };
    if (location) whereClause.location = { [Op.like]: `%${location}%` };
    if (companyName) whereClause.companyName = { [Op.like]: `%${companyName}%` };
    if (position) whereClause.position = { [Op.like]: `%${position}%` };
    if (customerId) whereClause.customerId = { [Op.like]: `%${customerId}%` };
    if (joinDate) whereClause.joinDate = joinDate; // or use Op.gte/lte for range
    if (status) whereClause.status = status;

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

// ✅ Get Single User
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: UserFile,
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

// ✅ Update User + File
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const userData = JSON.parse(req.body.user);
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    await user.update(userData);

    if (req.file) {
      const uploadedAt = req.body.uploadedAt ? new Date(req.body.uploadedAt) : new Date();
      await UserFile.create({
        userId,
        fileName: req.file.filename,
        filePath: req.file.path,
        uploadedAt
      });
      return res.json({ msg: 'User updated and file uploaded' });
    }

    res.json({ msg: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

// ✅ Delete User
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

// ✅ Upload Single File
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const { userId } = req.params;
    const uploadedAt = req.body.uploadedAt ? new Date(req.body.uploadedAt) : new Date();

    const file = await UserFile.create({
      userId,
      fileName: req.file.filename,
      filePath: req.file.path,
      uploadedAt
    });

    res.json({ msg: 'File uploaded successfully', file });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// ✅ Upload Multiple Files
exports.uploadFiles = async (req, res) => {
  try {
    const { userId } = req.params;
    const uploadedAt = req.body.uploadedAt ? new Date(req.body.uploadedAt) : new Date();

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No files uploaded' });
    }

    const uploaded = await Promise.all(req.files.map(file =>
      UserFile.create({
        userId,
        fileName: file.originalname,
        filePath: file.path,
        uploadedAt
      })
    ));

    res.json({ msg: 'Files uploaded', files: uploaded });
  } catch (err) {
    res.status(500).json({ msg: 'Upload failed', error: err.message });
  }
};

// ✅ Get All Files for a User (with pagination)
exports.getUserFiles = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: files } = await UserFile.findAndCountAll({
      where: { userId: req.params.id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['fileName', 'filePath', 'uploadedAt'],
      order: [['uploadedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: files,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};
// ✅ Update File
exports.updateFile = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const uploadedAt = req.body.uploadedAt ? new Date(req.body.uploadedAt) : new Date();

    const file = await UserFile.findOne({ where: { id: fileId, userId } });
    if (!file) return res.status(404).json({ msg: 'File not found' });

    await file.update({
      fileName: req.file.filename,
      filePath: req.file.path,
      uploadedAt
    });

    res.json({ msg: 'File updated successfully', file });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};
