require('dotenv').config();
const mongoose = require('mongoose');
const Shop = require('./data/shops.js');
const Review = require('./data/review.js');

mongoose.connect(process.env.ATLAS_DB_URL, { tlsInsecure: true })
  .then(async () => {
    console.log("Connected to DB");
    const shop = await Shop.findOne({ shopName: /bobby watch/i });
    if (!shop) {
      console.log("Shop not found");
      process.exit(1);
    }
    console.log(`Found shop: ${shop.shopName} with ${shop.reviews.length} reviews`);
    
    // Delete the actual review documents
    const delRes = await Review.deleteMany({ _id: { $in: shop.reviews } });
    console.log(`Deleted ${delRes.deletedCount} reviews from Review collection`);
    
    // Clear reviews from shop array
    shop.reviews = [];
    // Reset avg rating if any
    if (shop.avgRating) shop.avgRating = 0;
    
    await shop.save();
    console.log("Cleared reviews from shop document");
    
    process.exit(0);
  })
  .catch(err => {
    console.error("DB Error:", err);
    process.exit(1);
  });
