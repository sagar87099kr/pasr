require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./data/order');
mongoose.connect(process.env.ATLAS_DB_URL).then(async () => {
  const order = await Order.findOne().sort({createdAt: -1});
  console.log(order);
  process.exit(0);
});
