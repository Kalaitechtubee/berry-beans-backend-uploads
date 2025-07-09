// ✅ server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const { sequelize } = require('./models');
const userRoutes = require('./routes/userRoutes');

app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));
app.use('/', userRoutes);

sequelize.sync({ alter: true }).then(() => {
  app.listen(3000, () => console.log('Server running on port 3000'));
});
