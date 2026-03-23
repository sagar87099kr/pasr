const crypto = require("crypto");
const Order = require("../data/order");
const orderBus = require("../events/eventBus");
const TransactionHistory = require("../data/transactionHistory");
const Shop = require("../data/shops");
const axios = require("axios");

module.exports.verifyPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing required payment details." });
        }

        // Verify the signature
        const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

        // Safety check: if secret is missing, fail fast with a clear error
        if (!secret) {
            console.error("[Payment] RAZORPAY_KEY_SECRET is not set in environment variables!");
            return res.status(500).json({ success: false, message: "Payment configuration error. Please contact support." });
        }

        const signatureInput = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(signatureInput)
            .digest('hex');

        // Debug log — safe to keep in production (no full secret exposed)
        console.log(`[Payment] Verifying: order=${razorpay_order_id}, payment=${razorpay_payment_id}`);
        console.log(`[Payment] Secret key length=${secret.length}, ends_with=...${secret.slice(-4)}`);
        console.log(`[Payment] Received sig (first 16): ${razorpay_signature.slice(0, 16)}...`);
        console.log(`[Payment] Generated sig (first 16): ${generated_signature.slice(0, 16)}...`);
        console.log(`[Payment] Signatures match: ${generated_signature === razorpay_signature}`);

        if (generated_signature !== razorpay_signature) {
            console.error(`[Payment] MISMATCH — Key ends with: ...${secret.slice(-4)}, full order: ${razorpay_order_id}`);
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }

        if (!orderId) {
             return res.status(400).json({ success: false, message: "Missing Order Database Mapping." });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found in database." });
        }

        // Only update the existing database order
        order.paymentStatus = 'VERIFIED';
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;

        await order.save();

        // Remove from session cart cache so it resets cleanly
        const cart = req.session.cart;
        if (cart) {
            cart.items = cart.items.filter(item => String(item.shopId) !== String(order.shopId));
            cart.subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
            cart.shopId = cart.items.length === 0 ? null : cart.shopId;
        }

        // Ensure session save since we modified cart and pendingOrders
        req.session.save(async () => {
            orderBus.emit("PAYMENT_VERIFIED", order);
            res.status(200).json({ success: true, message: "Payment verified successfully.", orderId: order.orderId });
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Internal server error during verification." });
    }
};


module.exports.requestPayout = async (req, res) => {
    try {
        const { shopId, amount } = req.body;
        const shop = await Shop.findById(shopId);

        if (!shop || !shop.owner.equals(req.user._id)) {
            req.flash("error", "Unauthorized.");
            return res.redirect("/shops");
        }

        if (!shop.upiId) {
            req.flash("error", "No UPI ID configured. Please configure your UPI ID in shop settings.");
            return res.redirect(`/shops/${shopId}`);
        }

        const payoutAmount = parseFloat(amount);
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            req.flash("error", "Invalid payout amount.");
            return res.redirect(`/shops/${shopId}`);
        }

        // 1. Find the orders that make up this payout
        const unsettledOrders = await Order.find({
            shopId: shop._id,
            orderStatus: 'COMPLETED',
            settlementStatus: { $in: ['PENDING', 'REQUESTED'] }
        });

        const payoutOrders = unsettledOrders.filter(order => {
            if (order.selfDelivery && order.paymentType === 'PREPAID') return true;
            if (!order.selfDelivery) return true;
            return false;
        });

        const orderIds = payoutOrders.map(o => o.orderId);

        if (orderIds.length === 0) {
            req.flash("error", "No eligible completed orders found for payout.");
            return res.redirect(`/shops/${shopId}`);
        }

        // 2. Create a PENDING Payout Transaction for manual approval
        await TransactionHistory.create({
            shopId: shop._id,
            type: 'PAYOUT_TO_SHOP',
            amount: payoutAmount,
            status: 'PENDING',
            metadata: {
                upiId: shop.upiId,
                ordersSettled: orderIds,
                requestDate: new Date()
            }
        });

        // 3. Mark Orders as REQUESTED
        await Order.updateMany(
            { _id: { $in: payoutOrders.map(o => o._id) } },
            { $set: { settlementStatus: 'REQUESTED' } }
        );

        req.flash("success", `Payout request for ₹${payoutAmount} submitted successfully. Admin (8709956547) will process it to ${shop.upiId} soon.`);
        return res.redirect(`/shops/${shopId}`);

    } catch (error) {
        console.error("Payout Request Error:", error);
        req.flash("error", "Failed to process payout request.");
        return res.redirect("back");
    }
};

module.exports.payCommission = async (req, res) => {
    try {
        const { shopId, amount } = req.body;
        const shop = await Shop.findById(shopId);

        if (!shop || !shop.owner.equals(req.user._id)) {
            req.flash("error", "Unauthorized.");
            return res.redirect("/shops");
        }

        const commissionAmount = parseFloat(amount);
        if (isNaN(commissionAmount) || commissionAmount <= 0) {
            req.flash("error", "Invalid commission amount.");
            return res.redirect(`/shops/${shopId}`);
        }

        // Manual UPI Payment Fallback (Bypassing Razorpay due to GST Constraints)
        req.flash("success", `Please manually pay ₹${commissionAmount} to Admin UPI ID: sagarkumarv71-1@oksbi to settle your commission.`);
        return res.redirect(`/shops/${shopId}`);

    } catch (error) {
        console.error("Pay Commission Error:", error);
        req.flash("error", "Failed to initiate manual payment. Please try again later.");
        res.redirect("back");
    }
};

module.exports.verifyCommissionPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            shopId,
            amount
        } = req.body;

        const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            req.flash("error", "Payment verification failed.");
            return res.redirect(`/shops/${shopId}`);
        }

        // Find COD Self-Delivery orders that owed commission
        const unsettledOrders = await Order.find({
            shopId: shopId,
            orderStatus: 'COMPLETED',
            settlementStatus: 'PENDING',
            selfDelivery: true,
            paymentType: 'COD'
        });

        const orderIds = unsettledOrders.map(o => o.orderId);

        // Record Transaction
        await TransactionHistory.create({
            shopId: shopId,
            type: 'COMMISSION_PAID_TO_PASR',
            amount: parseFloat(amount),
            razorpayPaymentId: razorpay_payment_id,
            status: 'SUCCESS',
            metadata: {
                ordersSettled: orderIds
            }
        });

        // Mark as settled
        await Order.updateMany(
            { _id: { $in: unsettledOrders.map(o => o._id) } },
            { $set: { settlementStatus: 'SETTLED' } }
        );

        req.flash("success", `Payment of ₹${amount} successful. Commission debt cleared.`);
        res.redirect(`/shops/${shopId}`);

    } catch (error) {
        console.error("Verify Commission Error:", error);
        req.flash("error", "Error verifying payment, contact support if amount was deducted.");
        res.redirect(`/shops/${shopId}`);
    }
};
