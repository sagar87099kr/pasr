const mongoose = require('mongoose');
const Provider = require('./data/serviceproviders.js');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/pasr');
    const providers = await Provider.find({}).lean();
    providers.forEach(p => console.log(p._id.toString()));
    mongoose.disconnect();
}
test().catch(console.error);
