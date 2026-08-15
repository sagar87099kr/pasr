require('dotenv').config();
const mongoose = require('mongoose');
const Shop = require('./data/shops.js');

mongoose.connect(process.env.ATLAS_DB_URL, { tlsInsecure: true })
  .then(async () => {
    console.log("Connected to DB");
    const shop = await Shop.findOne({ shopName: /bobby/i });
    console.log("Shop:", shop ? shop._id : "Not found");
    process.exit(0);
  })
  .catch(err => {
    console.error("DB Error:", err.message);
    process.exit(1);
  });
