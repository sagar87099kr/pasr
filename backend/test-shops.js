const mongoose = require('mongoose');
const Shop = require('./data/shops.js');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/pasr');
    
    const shops = await Shop.find({ verified: true }).populate('bazaar').sort({ createdAt: -1 }).limit(5);
    
    console.log(`Found ${shops.length} verified shops recently:`);
    shops.forEach(s => {
        console.log(`- Shop: ${s.shopName} | Category: ${s.category}`);
        console.log(`  Bazaar: ${s.bazaar ? (s.bazaar.name || s.bazaar.bazaarName) : 'NONE'}`);
        console.log(`  Verified: ${s.verified}`);
    });
    
    mongoose.disconnect();
}
test().catch(console.error);
