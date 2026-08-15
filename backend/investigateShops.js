const mongoose = require('mongoose');
const Transaction = mongoose.model('TransactionHistory', new mongoose.Schema({}, { strict: false }), 'transactionhistories');
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');
const Shop = mongoose.model('Shop', new mongoose.Schema({}, { strict: false }), 'shops');

async function run() {
    try {
        await mongoose.connect('mongodb://sagar_03:jGpZtSg59Nq6B7PS@ac-kxcg7ut-shard-00-00.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-01.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-02.uo7zpee.mongodb.net:27017/test?ssl=true&replicaSet=atlas-tjqeny-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0', { family: 4, tlsInsecure: true });
        
        const payouts = await Transaction.find({ type: 'PAYOUT_TO_SHOP' }).lean();
        
        let shopStats = {};

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
                
                if (overpaid > 0) {
                    const shopId = order.shopId || (order.shop ? order.shop.toString() : 'unknown');
                    if (!shopStats[shopId]) {
                        shopStats[shopId] = { overpaid: 0, count: 0, name: '' };
                    }
                    shopStats[shopId].overpaid += overpaid;
                    shopStats[shopId].count += 1;
                }
            }
        }
        
        // Fetch shop names
        for (let shopId of Object.keys(shopStats)) {
            if (shopId !== 'unknown') {
                const shopDoc = await Shop.findById(shopId).lean();
                if (shopDoc) {
                    shopStats[shopId].name = shopDoc.shopName;
                } else {
                    shopStats[shopId].name = 'Unknown Shop ID ' + shopId;
                }
            }
        }
        
        const results = Object.values(shopStats).sort((a, b) => b.overpaid - a.overpaid);
        console.log(JSON.stringify(results, null, 2));
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
