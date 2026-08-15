const mongoose = require('mongoose');
const Transaction = mongoose.model('TransactionHistory', new mongoose.Schema({}, { strict: false }), 'transactionhistories');
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');
const Shop = mongoose.model('Shop', new mongoose.Schema({}, { strict: false }), 'shops');

async function run() {
    try {
        await mongoose.connect('mongodb://sagar_03:jGpZtSg59Nq6B7PS@ac-kxcg7ut-shard-00-00.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-01.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-02.uo7zpee.mongodb.net:27017/test?ssl=true&replicaSet=atlas-tjqeny-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0', { family: 4, tlsInsecure: true });
        
        const shop = await Shop.findOne({ shopName: { $regex: /Fuggi gift corner/i } }).lean();
        if(!shop) {
            console.log("Shop not found.");
            return;
        }
        
        console.log(`Found Shop: ${shop.shopName} (ID: ${shop._id})`);
        
        const payouts = await Transaction.find({ type: 'PAYOUT_TO_SHOP', shopId: shop._id }).lean();
        console.log(`Found ${payouts.length} payout(s).`);
        
        for (let tx of payouts) {
            console.log(`\n--- Payout TX ID: ${tx._id} | Amount requested: ₹${tx.amount} | Status: ${tx.status} ---`);
            if (!tx.metadata || !tx.metadata.ordersSettled) continue;
            
            const orders = await Order.find({ orderId: { $in: tx.metadata.ordersSettled } }).lean();
            
            for (let order of orders) {
                const oldIsSelfPickup = !!order.selfDelivery || order.deliveryType === 'Self Pickup';
                const actualItemPrice = order.subtotalAmount || ((order.totalAmount || 0) + (order.coinDiscount || 0));
                const pasrCommission = order.pasrCommission || 0;
                const coinDiscount = order.coinDiscount || 0;
                
                const newIsSelfPickup = !!order.selfDelivery || order.deliveryType === 'Self Pickup' || order.deliveryType === 'SELF_PICKUP';
                
                console.log(`\nOrder ID: ${order.orderId}`);
                console.log(`Delivery Type: ${order.deliveryType}, Self Delivery Flag: ${order.selfDelivery}`);
                console.log(`Payment Type: ${order.paymentType}`);
                console.log(`Cart Total / Subtotal: ₹${actualItemPrice}`);
                console.log(`Customer Paid Cash: ₹${order.totalAmount}`);
                console.log(`Coin Discount Used: ₹${coinDiscount}`);
                console.log(`PASR Commission: ₹${pasrCommission}`);
                
                if (newIsSelfPickup && !oldIsSelfPickup) {
                    let bugEarnings = actualItemPrice; 
                    let correctEarnings = (order.paymentType === 'PREPAID') ? 
                        (actualItemPrice + (order.deliveryCharge||0) - pasrCommission) : 
                        (coinDiscount - pasrCommission);
                        
                    console.log(`=> This order was AFFECTED by the bug.`);
                    console.log(`=> Platform Paid Shop: ₹${bugEarnings} (Incorrect)`);
                    console.log(`=> Platform Should Have Paid: ₹${correctEarnings} (Correct)`);
                    console.log(`=> Difference (Overpaid): ₹${bugEarnings - correctEarnings}`);
                } else {
                    console.log(`=> This order was NOT affected by the bug.`);
                }
            }
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
