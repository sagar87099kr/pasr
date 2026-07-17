require('dotenv').config();
const mongoose = require('mongoose');
const Provider = require('./data/serviceproviders.js');
const Bazaar = require('./data/bazaar.js');

async function test() {
    await mongoose.connect(process.env.ATLAS_DB_URL, { tlsInsecure: true });
    const providers = await Provider.find({}).sort({ createdAt: -1 }).limit(10).populate('bazaar').lean();
    
    console.log(`Found ${providers.length} providers recently:`);
    providers.forEach(p => {
        console.log(`- ID: ${p._id} | Company: ${p.company}`);
        console.log(`  Category: ${p.categories}`);
        console.log(`  Bazaar: ${p.bazaar ? (p.bazaar.name || p.bazaar.bazaarName) : 'NONE'} (ID: ${p.bazaar ? p.bazaar._id : 'NONE'})`);
        console.log(`  Verified: ${p.verified}`);
    });
    
    mongoose.disconnect();
}
test().catch(console.error);
