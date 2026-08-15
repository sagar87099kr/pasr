const mongoose = require('mongoose');
const Transaction = mongoose.model('TransactionHistory', new mongoose.Schema({}, { strict: false }), 'transactionhistories');
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');

async function run() {
    try {
        await mongoose.connect('mongodb://sagar_03:jGpZtSg59Nq6B7PS@ac-kxcg7ut-shard-00-00.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-01.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-02.uo7zpee.mongodb.net:27017/test?ssl=true&replicaSet=atlas-tjqeny-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0', { family: 4, tlsInsecure: true });
        
        // Find all payouts
        const payouts = await Transaction.find({ type: 'PAYOUT_TO_SHOP' }).lean();
        
        let totalOverpaid = 0;
        let affectedOrdersCount = 0;

        for (let tx of payouts) {
            if (!tx.metadata || !tx.metadata.ordersSettled || tx.metadata.ordersSettled.length === 0) continue;
            
            const orders = await Order.find({ orderId: { $in: tx.metadata.ordersSettled } }).lean();
            
            for (let order of orders) {
                const oldIsSelfPickup = !!order.selfDelivery || order.deliveryType === 'Self Pickup';
                const actualItemPrice = order.subtotalAmount || ((order.totalAmount || 0) + (order.coinDiscount || 0));
                const pasrCommission = order.pasrCommission || 0;
                const coinDiscount = order.coinDiscount || 0;
                
                if (oldIsSelfPickup) continue;
                
                const newIsSelfPickup = !!order.selfDelivery || order.deliveryType === 'Self Pickup' || order.deliveryType === 'SELF_PICKUP';
                if (!newIsSelfPickup) continue;
                
                affectedOrdersCount++;
                
                let bugEarnings = actualItemPrice; 
                let correctEarnings = 0;
                if (order.paymentType === 'PREPAID') {
                    correctEarnings = actualItemPrice;
                    if (order.deliveryType === 'HOME_DELIVERY') {
                        correctEarnings += (order.deliveryCharge || 0);
                    }
                    correctEarnings -= pasrCommission;
                } else {
                    correctEarnings = coinDiscount - pasrCommission;
                }
                
                const overpaid = bugEarnings - correctEarnings;
                totalOverpaid += overpaid;
            }
        }
        
        console.log(`\n======================================`);
        console.log(`Total Payout Requests (Pending/Completed): ${payouts.length}`);
        console.log(`Orders Affected by Bug (across all requests): ${affectedOrdersCount}`);
        console.log(`Total Inflated Value (Overpaid/Requested): ₹${totalOverpaid}`);
        console.log(`======================================\n`);
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
