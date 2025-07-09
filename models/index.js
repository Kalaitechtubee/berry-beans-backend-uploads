// ✅ models/index.js
const sequelize = require('../config/db');
const User = require('./user');
const UserFile = require('./userFile');

User.hasMany(UserFile, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserFile.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, UserFile };