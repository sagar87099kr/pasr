require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./data/order');

mongoose.connect(process.env.ATLAS_DB_URL)
  .then(async () => {
    const order = await Order.findOne({ orderId: 'PASR-ORD-1784725342677-416' });
    if(order) {
        console.log(JSON.stringify({
            orderId: order.orderId,
            orderStatus: order.orderStatus,
            deliveryPartnerId: order.deliveryPartnerId,
            cancellationReason: order.cancellationReason
        }, null, 2));
    } else {
        console.log("Order not found");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
