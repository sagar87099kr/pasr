const mongoose = require('mongoose');
const Transaction = mongoose.model('TransactionHistory', new mongoose.Schema({}, { strict: false }), 'transactionhistories');
const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }), 'orders');

async function run() {
    try {
        await mongoose.connect('mongodb://sagar_03:jGpZtSg59Nq6B7PS@ac-kxcg7ut-shard-00-00.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-01.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-02.uo7zpee.mongodb.net:27017/test?ssl=true&replicaSet=atlas-tjqeny-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0', { family: 4, tlsInsecure: true });
        
        const tx = await Transaction.findOne({ shopId: new mongoose.Types.ObjectId("6a60e2ad302c223e9fc536d3"), status: 'PENDING' });
        if (tx) {
            console.log(`Found pending tx. Amount: ${tx.amount}`);
            console.log(`Orders tied to this tx:`, tx.metadata ? tx.metadata.ordersSettled : null);
            
            await Transaction.deleteOne({ _id: tx._id });
            console.log("Deleted the invalid transaction.");
            
            if (tx.metadata && tx.metadata.ordersSettled) {
                const res = await Order.updateMany(
                    { orderId: { $in: tx.metadata.ordersSettled } },
                    { $set: { settlementStatus: 'PENDING' } }
                );
                console.log(`Reverted ${res.modifiedCount} orders to PENDING.`);
            }
        } else {
            console.log("No pending transaction found for this shopId");
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
