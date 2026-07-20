const mongoose = require('mongoose');
const Provider = require('./data/serviceproviders.js');
const Bazaar = require('./data/bazaar.js');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/pasr');
    
    // Check specific provider from screenshot (e.g., 69fdf86e - needs the rest of the object id)
    // Actually, I can just find by string matching
    const providers = await Provider.find({}).populate('bazaar').lean();
    
    const target = providers.filter(p => p._id.toString().startsWith('6a588f4a'));
    console.log("Target Provider:");
    console.log(target);
    
    mongoose.disconnect();
}
test().catch(console.error);
