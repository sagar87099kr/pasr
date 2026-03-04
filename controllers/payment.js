const crypto = require("crypto");
const Order = require("../data/order");
const orderBus = require("../events/eventBus");

module.exports.verifyPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId // Our internal DB order ID (_id)
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
            return res.status(400).json({ success: false, message: "Missing required payment details." });
        }

        // Verify the signature
        const secret = process.env.RAZORPAY_KEY_SECRET;
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }

        // Signature is valid, find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (order.paymentStatus === 'VERIFIED') {
            return res.status(200).json({ success: true, message: "Order payment already verified." });
        }

        // Verify that the razorpay_order_id matches what we saved
        if (order.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({ success: false, message: "Order ID mismatch." });
        }

        // Update Order Status safely without skipping fulfillment steps
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;
        order.paymentStatus = 'VERIFIED';
        // DO NOT change orderStatus to 'READY_FOR_DELIVERY' here, let the shopkeeper pack it first.

        await order.save();

        // Emit the event to notify the shop owner and customer
        orderBus.emit("PAYMENT_VERIFIED", order);

        res.status(200).json({
            success: true,
            message: "Payment verified successfully.",
            orderId: order.orderId
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Internal server error during verification." });
    }
};
