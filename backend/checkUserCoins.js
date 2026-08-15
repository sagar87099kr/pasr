require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./data/customers');
const Order = require('./data/order');

async function checkUser() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, { family: 4, tlsInsecure: true });
        console.log("Connected to MongoDB");

        const user = await Customer.findOne({ username: '8404921747' });
        if (!user) {
            console.log("User 8404921747 not found.");
            process.exit(1);
        }

        console.log(`User Name: ${user.name}`);
        console.log(`Current Coin Balance: ${user.coins || 0}`);
        console.log(`Referral Count (friends referred): ${user.referralCount || 0}`);
        // Base coins is 5 for signing up, plus 10 per referral
        const totalEarned = 5 + (user.referralCount || 0) * 10;
        console.log(`Expected Lifetime Earned Coins: ${totalEarned}`);

        const orders = await Order.find({ customerId: user._id });
        console.log(`Total Orders Placed: ${orders.length}`);

        let totalCoinsSpent = 0;
        let cancelledCoinsRefunded = 0;
        let validCoinsSpent = 0;
        
        for (let order of orders) {
            const discount = order.coinDiscount || 0;
            if (discount > 0) {
                totalCoinsSpent += discount;
                if (order.isRefunded) {
                    cancelledCoinsRefunded += discount;
                } else {
                    validCoinsSpent += discount;
                }
                console.log(`Order ${order.orderId || order._id}: Status=${order.orderStatus}, Coin Discount=${discount}, isRefunded=${order.isRefunded}`);
            }
        }

        console.log("-----------------------------------------");
        console.log(`Total Gross Coins Spent (Before Refunds): ${totalCoinsSpent}`);
        console.log(`Coins Refunded due to Cancellations/Rejections: ${cancelledCoinsRefunded}`);
        console.log(`Total Net Coins Spent (Successfully used): ${validCoinsSpent}`);
        console.log(`Expected Current Balance (Earned - Net Spent): ${totalEarned - validCoinsSpent}`);
        console.log(`Actual Current Balance in DB: ${user.coins || 0}`);
        
        if ((user.coins || 0) > (totalEarned - validCoinsSpent)) {
            console.log("⚠️ Discrepancy detected! User has MORE coins than they should logically have. (Likely exploited the cancellation race condition)");
            console.log(`Difference: ${(user.coins || 0) - (totalEarned - validCoinsSpent)} extra coins detected (likely duplicate-refunded).`);
        }

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
checkUser();
