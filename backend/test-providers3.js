const mongoose = require('mongoose');
const Provider = require('./data/serviceproviders.js');
const Bazaar = require('./data/bazaar.js');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/pasr');
    const providers = await Provider.find({ verified: true }).populate('bazaar').sort({ createdAt: -1 }).limit(10);
    
    console.log(`Found ${providers.length} verified providers recently:`);
    providers.forEach(p => {
        console.log(`- ID: ${p._id} | Company: ${p.company} | Category: ${p.categories}`);
        console.log(`  Bazaar: ${p.bazaar ? (p.bazaar.name || p.bazaar.bazaarName) : 'NONE'}`);
        console.log(`  Verified: ${p.verified}`);
    });
    mongoose.disconnect();
}
test().catch(console.error);
