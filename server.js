const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));  // Serve uploaded files

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key';
// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// File Upload API
app.post('/upload/:userId', upload.single('file'), (req, res) => {
    const userId = req.params.userId;

    if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded', });
    }

    // Check if user exists
    const checkUserSql = 'SELECT * FROM users WHERE id = ?';
    db.query(checkUserSql, [userId], (err, userResults) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (userResults.length === 0) return res.status(404).json({ msg: 'User not found' });

        // Insert file details into user_files table
        const insertFileSql = 'INSERT INTO user_files (userId, fileName, filePath) VALUES (?, ?, ?)';
        db.query(insertFileSql, [userId, req.file.filename, req.file.path ,], (err) => {
            if (err) return res.status(500).json({ msg: 'Database error while saving file info' });

            res.json({
                msg: 'File uploaded successfully',
                fileDetails: {
                    fileName: req.file.filename,
                    filePath: req.file.path
                }
            });
        });
    });
});


// ✅ Register
app.post('/register', (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ msg: 'All fields required' });

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).json({ msg: 'Error hashing password' });

        const sql = 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)';
        db.query(sql, [email, hashedPassword, name], (err) => {
            if (err) return res.status(500).json({ msg: 'Email may already exist' });
            res.json({ msg: 'User registered successfully' });
        });
    });
});

// ✅ Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (results.length === 0) return res.status(401).json({ msg: 'Invalid email or password' });

        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ msg: 'Error comparing passwords' });
            if (!isMatch) return res.status(401).json({ msg: 'Invalid email or password' });

            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '90d' });
            res.json({ msg: 'Login successful', token });
        });
    });
});

// ✅ Forgot Password
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email required' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    const expireTime = new Date(Date.now() + 15 * 60 * 1000);

    const sql = 'UPDATE users SET resetPasswordToken = ?, resetPasswordExpire = ? WHERE email = ?';
    db.query(sql, [resetToken, expireTime, email], (err, result) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ msg: 'Email not found' });

        res.json({ msg: 'Reset token generated', resetToken });
    });
});

// ✅ Reset Password
app.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ msg: 'Token and new password required' });

    const sql = 'SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpire > NOW()';
    db.query(sql, [token], (err, results) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (results.length === 0) return res.status(400).json({ msg: 'Invalid or expired token' });

        const userId = results[0].id;
        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
            if (err) return res.status(500).json({ msg: 'Error hashing password' });

            const updateSql = 'UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpire = NULL WHERE id = ?';
            db.query(updateSql, [hashedPassword, userId], (err) => {
                if (err) return res.status(500).json({ msg: 'Database error' });
                res.json({ msg: 'Password updated successfully' });
            });
        });
    });
});

// ✅ Get All Users
app.get('/users', (req, res) => {
    db.query('SELECT id, email, name FROM users', (err, results) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        res.json(results);
    });
});



app.get('/user/:id', (req, res) => {
    const userId = req.params.id;

    const userSql = 'SELECT * FROM users WHERE id = ?';
    db.query(userSql, [userId], (err, userResults) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (userResults.length === 0) return res.status(404).json({ msg: 'User not found' });

        const user = userResults[0];

        const fileSql = 'SELECT id, fileName, filePath, uploadedAt FROM user_files WHERE userId = ?';
        db.query(fileSql, [userId], (err, fileResults) => {
            if (err) return res.status(500).json({ msg: 'Database error while fetching files' });

            res.json({
                user,
                files: fileResults
            });
        });
    });
});

// ✅ Update User by ID

app.put('/user/:id', upload.single('file'), (req, res) => {
    const userId = req.params.id;

    // Parse user details from 'user' field (sent as JSON string)
    let userData;
    try {
        userData = JSON.parse(req.body.user);
    } catch (err) {
        return res.status(400).json({ msg: 'Invalid user data format' });
    }

    const { name, age, phone, address, designation, employeeId } = userData;

    const updateSql = `
        UPDATE users SET name = ?, age = ?, phone = ?, address = ?, designation = ?, employeeId = ? WHERE id = ?
    `;

    db.query(updateSql, [name, age, phone, address, designation, employeeId, userId], (err, result) => {
        if (err) return res.status(500).json({ msg: 'Database error while updating user' });
        if (result.affectedRows === 0) return res.status(404).json({ msg: 'User not found' });

        if (req.file) {
            const insertFileSql = 'INSERT INTO user_files (userId, fileName, filePath) VALUES (?, ?, ?)';
            db.query(insertFileSql, [userId, req.file.filename, req.file.path], (err) => {
                if (err) return res.status(500).json({ msg: 'Database error while saving file' });

                return res.json({ msg: 'User updated and file uploaded successfully', fileName: req.file.filename });
            });
        } else {
            res.json({ msg: 'User updated successfully (no file uploaded)' });
        }
    });
});



// ✅ Get User Files

app.get('/user/:id/files', (req, res) => {
    const userId = req.params.id;

    const sql = 'SELECT id, fileName, filePath, uploadedAt FROM user_files WHERE userId = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        
        res.json({
            msg: 'Files fetched successfully',
            files: results
        });
    });
});



// ✅ Update User File
app.put('/user/:userId/files/:fileId', upload.single('file'), (req, res) => {
    const userId = req.params.userId;
    const fileId = req.params.fileId;

    if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
    }

    // Check if the file belongs to the user
    const checkFileSql = 'SELECT * FROM user_files WHERE id = ? AND userId = ?';
    db.query(checkFileSql, [fileId, userId], (err, results) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (results.length === 0) return res.status(404).json({ msg: 'File not found for this user' });

        // Update file details
        const updateFileSql = 'UPDATE user_files SET fileName = ?, filePath = ?, uploadedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?';
        db.query(updateFileSql, [req.file.filename, req.file.path, fileId, userId], (err) => {
            if (err) return res.status(500).json({ msg: 'Database error while updating file' });

            res.json({
                msg: 'File updated successfully',
                fileDetails: {
                    fileName: req.file.filename,
                    filePath: req.file.path
                }
            });
        });
    });
});


// ✅ Delete User
app.delete('/user/:id', (req, res) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ msg: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ msg: 'User not found' });
        res.json({ msg: 'User deleted successfully' });
    });
});






app.listen(3000, () => console.log('Server running on port 3000'));




