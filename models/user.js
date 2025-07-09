const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  phone: DataTypes.STRING,
  age: DataTypes.STRING,
  address: DataTypes.STRING,
  designation: DataTypes.STRING,
  employeeId: DataTypes.STRING,
  resetPasswordToken: DataTypes.STRING,
  resetPasswordExpire: DataTypes.DATE,
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW 
  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;
