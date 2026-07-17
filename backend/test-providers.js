const mongoose = require('mongoose');
const Provider = require('./data/serviceproviders.js');
const Bazaar = require('./data/bazaar.js');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/pasr'); // Adjust DB name if needed
    
    // Check all verified providers
    const providers = await Provider.find({ verified: true }).populate('bazaar').sort({ createdAt: -1 }).limit(5);
    
    console.log(`Found ${providers.length} verified providers recently:`);
    providers.forEach(p => {
        console.log(`- Company: ${p.company} | Category: ${p.categories}`);
        console.log(`  Bazaar: ${p.bazaar ? p.bazaar.name : 'NONE'}`);
        console.log(`  Verified: ${p.verified}`);
        console.log(`  Geometry: ${JSON.stringify(p.geometry.coordinates)}`);
    });
    
    mongoose.disconnect();
}
test().catch(console.error);
