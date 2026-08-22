const mongoose = require('mongoose');

const uri = "mongodb://sagar_03:jGpZtSg59Nq6B7PS@ac-kxcg7ut-shard-00-00.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-01.uo7zpee.mongodb.net:27017,ac-kxcg7ut-shard-00-02.uo7zpee.mongodb.net:27017/test?ssl=true&replicaSet=atlas-tjqeny-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

async function main() {
    await mongoose.connect(uri, { tlsInsecure: true });
    console.log("Connected");
    const db = mongoose.connection.db;
    
    // Find all recent orders and just check if JSON.stringify contains the ID
    const orders = await db.collection('orders').find({}).sort({createdAt: -1}).limit(50).toArray();
    for (let order of orders) {
        let str = JSON.stringify(order);
        if (str.includes("1786863261180-303")) {
            console.log("Found order! ID:", order._id);
            console.log("Order contents:", str);
            
            let correctDeliveryCharge = 5;
            let distance = order.deliveryDistance || 0;
            let roundedDistance = Math.ceil(distance);
            if(roundedDistance === 0) roundedDistance = 1;
            
            const tiers = [
                { maxDistance: 1, charge: 5 },
                { maxDistance: 2, charge: 10 },
                { maxDistance: 3, charge: 15 },
                { maxDistance: 4, charge: 20 },
                { maxDistance: 5, charge: 25 }
            ];
            
            let tier = tiers.find(t => t.maxDistance === roundedDistance);
            if(tier) correctDeliveryCharge = tier.charge;
            
            let subtotal = order.subtotalAmount || 100;
            let platform = order.platformFee || 5;
            let newTotal = subtotal + correctDeliveryCharge + platform;
            
            console.log("New Delivery Charge:", correctDeliveryCharge);
            console.log("New Total:", newTotal);
            
            await db.collection('orders').updateOne(
                { _id: order._id },
                { $set: { 
                    deliveryCharge: correctDeliveryCharge,
                    totalAmount: newTotal 
                } }
            );
            console.log("Updated order successfully!");
        }
    }
    process.exit(0);
}

main().catch(console.error);
