const mongoose = require('mongoose');
require('dotenv').config();

async function checkPremData() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log("Connected to MongoDB.");

        const User = mongoose.connection.collection('customers');
        const Order = mongoose.connection.collection('orders');

        const mobileNo = 8404921747;
        const prem = await User.findOne({ username: mobileNo });
        if (!prem) {
            console.log(`User with mobile ${mobileNo} not found.`);
            process.exit(0);
        }

        console.log("Found User:");
        console.log(`Name: ${prem.name}`);
        console.log(`Mobile: ${prem.username}`);
        console.log(`Referral Code (his code): ${prem.referralCode}`);
        console.log(`Coins Left: ${prem.coins}`);

        const ReferralUsage = mongoose.connection.collection('referralusages');
        const usages = await ReferralUsage.find({ usedCode: prem.referralCode }).toArray();
        console.log(`\nTotal Users Referred (by referralusages): ${usages.length}`);
        
        // Also check if there is an array in his own object
        if (prem.referredUsers) {
             console.log(`\nprom.referredUsers array length: ${prem.referredUsers.length}`);
        }

        // Check how many coins he has taken as discount.
        const orders = await Order.find({ customerId: prem._id }).toArray();
        let discountUsed = 0;
        orders.forEach(o => {
            if (o.coinsUsed) discountUsed += o.coinsUsed;
            if (o.coinDiscount) discountUsed += o.coinDiscount;
        });
        console.log(`\nTotal Orders: ${orders.length}`);
        console.log(`Total Coins Used for Discount across all orders: ${discountUsed}`);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

checkPremData();
