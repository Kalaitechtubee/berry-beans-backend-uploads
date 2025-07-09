const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, UserFile } = require('../models');
const { Op } = require('sequelize');
const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) return res.status(400).json({ msg: 'All fields required' });
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed });
    res.json({ msg: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ msg: 'Invalid email or password' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ msg: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
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
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { include: UserFile, attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const userData = JSON.parse(req.body.user);
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    await user.update(userData);
    if (req.file) {
      await UserFile.create({ userId, fileName: req.file.filename, filePath: req.file.path });
      return res.json({ msg: 'User updated and file uploaded' });
    }
    res.json({ msg: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ msg: 'User not found' });
    res.json({ msg: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });
    const { userId } = req.params;
    const file = await UserFile.create({ userId, fileName: req.file.filename, filePath: req.file.path });
    res.json({ msg: 'File uploaded successfully', file });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.uploadFiles = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No files uploaded' });
    }

    const latestFile = await UserFile.findOne({
      where: { userId },
      order: [['fileNo', 'DESC']]
    });
    let fileNo = latestFile ? latestFile.fileNo + 1 : 1;

    const uploaded = await Promise.all(req.files.map(file =>
      UserFile.create({
        userId,
        fileName: file.originalname,
        filePath: file.path,
       
      })
    ));

    res.json({ msg: 'Files uploaded', files: uploaded });
  } catch (err) {
    res.status(500).json({ msg: 'Upload failed', error: err.message });
  }
};



exports.getUserFiles = async (req, res) => {
  try {
    const files = await UserFile.findAll({
      where: { userId: req.params.id },
      attributes: ['fileName', 'filePath']
    });
    res.json(files);
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

exports.updateFile = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const file = await UserFile.findOne({ where: { id: fileId, userId } });
    if (!file) return res.status(404).json({ msg: 'File not found' });
    await file.update({ fileName: req.file.filename, filePath: req.file.path, uploadedAt: new Date() });
    res.json({ msg: 'File updated successfully', file });
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};