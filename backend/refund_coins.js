const mongoose = require("mongoose");
const Order = require("./data/order");
const Customer = require("./data/customers");
require("dotenv").config({ path: "./.env" });

async function refund() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL, {
            
            
        });
        
        console.log("Connected to DB. Looking for unrefunded orders...");
        
        const orders = await Order.find({
            orderStatus: { $in: ['CANCELLED', 'REJECTED'] },
            coinDiscount: { $gt: 0 },
            isRefunded: { $ne: true },
            cancellationReason: { $ne: "Cancelled by Customer" }
        });
        
        console.log(`Found ${orders.length} past orders that require a coin refund.`);
        
        let totalCoinsRefunded = 0;
        let usersRefunded = 0;

        for (let order of orders) {
            console.log(`Processing Order ${order._id} (Coins to refund: ${order.coinDiscount})`);
            
            const customer = await Customer.findById(order.customerId);
            if (customer) {
                customer.coins = (customer.coins || 0) + order.coinDiscount;
                await customer.save();
                
                order.isRefunded = true;
                await order.save();
                
                totalCoinsRefunded += order.coinDiscount;
                usersRefunded++;
                console.log(`Refunded ${order.coinDiscount} coins to user ${customer.username}`);
            }
        }
        
        console.log("-----------------------------------------");
        console.log(`SUCCESS: Refunded a total of ${totalCoinsRefunded} coins across ${usersRefunded} users.`);
        process.exit(0);
    } catch (e) {
        console.error("Error running refund script:", e);
        process.exit(1);
    }
}

refund();
