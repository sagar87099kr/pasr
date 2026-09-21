const Order = require("../data/order");
const Razorpay = require("razorpay");
const { confirmAndShareOrder } = require("../controllers/payment");

let rzpInstance = null;

function getRazorpay() {
    if (!rzpInstance) {
        if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            rzpInstance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
        }
    }
    return rzpInstance;
}

/**
 * Reconciles all pending prepaid orders with Razorpay to recover any orders
 * where client callback was dropped or interrupted.
 */
async function reconcilePendingPrepaidOrders() {
    const rzp = getRazorpay();
    if (!rzp) {
        return;
    }

    try {
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const pendingOrders = await Order.find({
            paymentType: "PREPAID",
            orderStatus: "PENDING_PAYMENT",
            razorpayOrderId: { $exists: true, $ne: null },
            createdAt: { $gte: fortyEightHoursAgo }
        });

        if (pendingOrders.length === 0) {
            return;
        }

        console.log(`[PaymentReconciler] Scanning ${pendingOrders.length} pending prepaid orders with Razorpay...`);

        for (const order of pendingOrders) {
            try {
                const payments = await rzp.orders.fetchPayments(order.razorpayOrderId);
                const captured = payments.items?.find(p => p.status === 'captured' || p.captured === true);

                if (captured) {
                    console.log(`[PaymentReconciler] Found captured payment ${captured.id} for order ${order.orderId}! Reconciling...`);
                    await confirmAndShareOrder(order, captured.id);
                }
            } catch (fetchErr) {
                console.error(`[PaymentReconciler] Error fetching payments for order ${order.orderId}:`, fetchErr.message);
            }
        }
    } catch (e) {
        console.error("[PaymentReconciler] Error during reconciliation scan:", e);
    }
}

// Run on startup after brief delay and then every 2 minutes
setTimeout(reconcilePendingPrepaidOrders, 5000);
setInterval(reconcilePendingPrepaidOrders, 2 * 60 * 1000);

module.exports = {
    reconcilePendingPrepaidOrders
};
