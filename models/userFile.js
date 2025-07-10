const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserFile = sequelize.define('UserFile', {
  fileName: {
    type: DataTypes.STRING
  },
  filePath: {
    type: DataTypes.STRING
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false // require manual date input
  },
  userId: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'user_files',
  timestamps: false
});

module.exports = UserFile;
