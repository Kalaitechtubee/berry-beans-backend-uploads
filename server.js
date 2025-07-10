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

sequelize.sync({ force: false }) // WARNING: deletes all existing data
.then(() => {
  app.listen(3000, () => console.log('Server running on port 3000'));
});