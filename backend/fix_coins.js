const mongoose = require('mongoose');
const Customer = require('./data/customers');
const Order = require('./data/order');
require('dotenv').config();

mongoose.connect(process.env.ATLAS_DB_URL, { family: 4, tlsInsecure: true })
.then(async () => {
    try {
        const username = '8667242364';
        const user = await Customer.findOne({ username });
        if(!user) {
            console.log("User not found");
            process.exit(0);
        }
        
        console.log(`User ${username} current coins: ${user.coins}`);
        
        console.log(`Adding 392 coins...`);
        await Customer.updateOne({ _id: user._id }, { $inc: { coins: 392 } });
        const updated = await Customer.findOne({ username });
        console.log(`User ${username} updated coins: ${updated.coins}`);
        
    } catch(e) {
        console.error(e);
    }
    mongoose.disconnect();
});
