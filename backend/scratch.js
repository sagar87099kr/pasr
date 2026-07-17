require('dotenv').config();
const mongoose = require('mongoose');
const DB_URL = process.env.DB_URL || 'mongodb://127.0.0.1:27017/pasr';
mongoose.connect(DB_URL);
const Shop = require('./data/shops.js');
const Product = require('./data/product.js');
const Item = require('./data/item.js');
const MasterProduct = require('./data/masterProduct.js');
async function run() {
  const docs = await Promise.all([
    Shop.find({ $or: [{ shopName: /test/i }, { shopDescription: /test/i }] }),
    Product.find({ $or: [{ productName: /test/i }, { productDescription: /test/i }] }),
    Item.find({ name: /test/i }),
    MasterProduct.find({ name: /test/i })
  ]);
  console.log('Shops:', docs[0].map(s => s.shopName));
  console.log('Products:', docs[1].map(p => p.productName));
  console.log('Items:', docs[2].map(i => i.name));
  console.log('Master:', docs[3].map(m => m.name));
  if (docs[0].length) { await Shop.deleteMany({ _id: { $in: docs[0].map(d=>d._id) } }); console.log('Deleted shops'); }
  process.exit(0);
}
run();
