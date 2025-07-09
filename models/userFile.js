const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // ✅ Required!

const UserFile = sequelize.define('UserFile', {
  fileName: {
    type: DataTypes.STRING
  },
  filePath: {
    type: DataTypes.STRING
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },

  userId: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'user_files',
  timestamps: false
});

module.exports = UserFile;
