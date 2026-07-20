const mongoose = require('mongoose');
const Provider = require('./data/serviceproviders.js');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/pasr');
    const providers = await Provider.find({}).lean();
    
    console.log(`Total providers: ${providers.length}`);
    const unassigned = providers.filter(p => !p.bazaar);
    const target = providers.find(p => String(p._id).startsWith('6a588f4a'));
    
    console.log(`Unassigned: ${unassigned.length}`);
    if (target) {
        console.log(`Found target: _id=${target._id} company=${target.company} verified=${target.verified} bazaar=${target.bazaar}`);
    } else {
        console.log("Target not found!");
    }
    
    const target2 = providers.find(p => String(p._id).startsWith('69fdf86e'));
    if (target2) {
        console.log(`Found target2: _id=${target2._id} company=${target2.company} verified=${target2.verified} bazaar=${target2.bazaar}`);
    }
    
    mongoose.disconnect();
}
test().catch(console.error);
