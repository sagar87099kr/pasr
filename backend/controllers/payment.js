const crypto = require("crypto");
const Order = require("../data/order");
const orderBus = require("../events/eventBus");
const TransactionHistory = require("../data/transactionHistory");
const Shop = require("../data/shops");
const axios = require("axios");
const Customer = require("../data/customers");

module.exports.createPenaltyPayment = async (req, res, next) => {
    try {
        const customer = await Customer.findById(req.user._id);
        if (!customer || customer.pendingPenalty <= 0) {
            return res.status(400).json({ success: false, message: "No pending penalty." });
        }

        const Razorpay = require('razorpay');
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const rzpOrder = await rzp.orders.create({
            amount: Math.round(customer.pendingPenalty * 100),
            currency: "INR",
            receipt: `PENALTY_${customer._id}_${Date.now()}`
        });

        res.status(200).json({
            success: true,
            razorpay: {
                id: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (e) {
        console.error("Penalty order error", e);
        next(e);
    }
};

module.exports.verifyPenaltyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing required payment details." });
        }

        const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed." });
        }

        const customer = await Customer.findById(req.user._id);
        if (customer) {
            customer.pendingPenalty = 0;
            // The counter does not reset according to user's request:
            // "no after this if they again cancle it will again charged 25 rupess"
            await customer.save();
        }

        res.status(200).json({ success: true, message: "Penalty cleared successfully." });
    } catch (e) {
        next(e);
    }
};

// Helper function to safely confirm and dispatch an order upon verified payment
async function confirmAndShareOrder(order, paymentId, signature = null, req = null) {
    if (order.paymentStatus === 'VERIFIED' && order.orderStatus !== 'PENDING_PAYMENT') {
        return { alreadyVerified: true, order };
    }

    order.paymentStatus = 'VERIFIED';
    order.orderStatus = 'ORDER_SHARED';
    if (paymentId) order.razorpayPaymentId = paymentId;
    if (signature) order.razorpaySignature = signature;

    await order.save();

    // Remove from session cart cache if available
    if (req && req.session && req.session.cart) {
        const cart = req.session.cart;
        cart.items = cart.items.filter(item => String(item.shopId) !== String(order.shopId));
        cart.subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        cart.shopId = cart.items.length === 0 ? null : cart.shopId;
        req.session.save();
    }

    // Emit event bus signals to broadcast order to seller and delivery partners
    orderBus.emit("PAYMENT_VERIFIED", order);
    orderBus.emit("ORDER_CREATED", order);

    console.log(`[Payment] Order ${order.orderId} successfully verified and shared with seller.`);
    return { success: true, order };
}

module.exports.confirmAndShareOrder = confirmAndShareOrder;

module.exports.verifyPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id) {
            return res.status(400).json({ success: false, message: "Missing required payment details." });
        }

        // Verify the signature
        const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
        let isSignatureValid = false;

        if (razorpay_signature && secret) {
            const signatureInput = razorpay_order_id + "|" + razorpay_payment_id;
            const generated_signature = crypto
                .createHmac('sha256', secret)
                .update(signatureInput)
                .digest('hex');
            isSignatureValid = (generated_signature === razorpay_signature);
        }

        // Extra fallback: If signature check failed or was not provided, verify directly with Razorpay API
        if (!isSignatureValid) {
            try {
                const Razorpay = require('razorpay');
                const rzp = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET
                });
                const payment = await rzp.payments.fetch(razorpay_payment_id);
                if (payment && (payment.status === 'captured' || payment.captured === true) && payment.order_id === razorpay_order_id) {
                    console.log(`[Payment] Verified via Razorpay API fallback: ${razorpay_payment_id}`);
                    isSignatureValid = true;
                }
            } catch (apiErr) {
                console.error("[Payment] Razorpay API verification error:", apiErr.message);
            }
        }

        if (!isSignatureValid) {
            console.error(`[Payment] Verification failed for order=${razorpay_order_id}, payment=${razorpay_payment_id}`);
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature or uncaptured payment." });
        }

        // Flexible Order Lookup (by Mongo _id, custom orderId string, or razorpayOrderId)
        const mongoose = require("mongoose");
        let order = null;
        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findById(orderId);
        }
        if (!order && orderId) {
            order = await Order.findOne({ orderId: orderId });
        }
        if (!order && razorpay_order_id) {
            order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        }

        if (!order) {
            console.error(`[Payment] Order not found for orderId=${orderId}, razorpayOrderId=${razorpay_order_id}`);
            return res.status(404).json({ success: false, message: "Order not found in database for this payment." });
        }

        await confirmAndShareOrder(order, razorpay_payment_id, razorpay_signature, req);

        res.status(200).json({ success: true, message: "Payment verified successfully.", orderId: order.orderId });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        res.status(500).json({ success: false, message: "Internal server error during verification." });
    }
};

// Razorpay Server-to-Server Webhook Handler
module.exports.handleWebhook = async (req, res, next) => {
    try {
        const webhookSignature = req.headers['x-razorpay-signature'];
        const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "").trim();

        if (webhookSignature && webhookSecret) {
            const shasum = crypto.createHmac('sha256', webhookSecret);
            shasum.update(JSON.stringify(req.body));
            const digest = shasum.digest('hex');

            if (digest !== webhookSignature) {
                console.warn("[Razorpay Webhook] Webhook signature mismatch. Checking key secret...");
                const shasum2 = crypto.createHmac('sha256', (process.env.RAZORPAY_KEY_SECRET || "").trim());
                shasum2.update(JSON.stringify(req.body));
                if (shasum2.digest('hex') !== webhookSignature) {
                    console.error("[Razorpay Webhook] Invalid webhook signature rejected.");
                    return res.status(400).json({ status: "invalid_signature" });
                }
            }
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log(`[Razorpay Webhook] Event received: ${event}`);

        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = payload.payment?.entity;
            const orderEntity = payload.order?.entity;

            const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
            const rzpPaymentId = paymentEntity?.id;

            if (rzpOrderId) {
                const order = await Order.findOne({ razorpayOrderId: rzpOrderId });
                if (order) {
                    console.log(`[Razorpay Webhook] Auto-confirming order ${order.orderId} (${order._id})`);
                    await confirmAndShareOrder(order, rzpPaymentId, null, req);
                } else {
                    console.log(`[Razorpay Webhook] Order with rzpOrderId ${rzpOrderId} not found in DB`);
                }
            }
        }

        return res.status(200).json({ status: "ok" });
    } catch (err) {
        console.error("[Razorpay Webhook Error]:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
};

// Reconcile an individual order directly with Razorpay API
module.exports.reconcileOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const mongoose = require("mongoose");
        let order = null;
        if (mongoose.Types.ObjectId.isValid(orderId)) {
            order = await Order.findById(orderId);
        }
        if (!order) {
            order = await Order.findOne({ orderId: orderId });
        }
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.paymentStatus === 'VERIFIED') {
            return res.json({ success: true, verified: true, order });
        }

        if (!order.razorpayOrderId) {
            return res.json({ success: false, message: "No Razorpay Order ID found on this order." });
        }

        const Razorpay = require('razorpay');
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const payments = await rzp.orders.fetchPayments(order.razorpayOrderId);
        const captured = payments.items?.find(p => p.status === 'captured' || p.captured === true);

        if (captured) {
            await confirmAndShareOrder(order, captured.id, null, req);
            return res.json({ success: true, verified: true, message: "Payment verified and order placed successfully.", order });
        }

        return res.json({ success: false, verified: false, message: "Payment not captured on Razorpay." });
    } catch (e) {
        console.error("[Reconcile Order Error]:", e);
        res.status(500).json({ success: false, message: e.message });
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
            let earningsForShop = 0;
            const isSelfPickup = order.deliveryType === 'Self Pickup' || order.deliveryType === 'SELF_PICKUP';
            const actualItemPrice = order.subtotalAmount || Math.max(0, (order.totalAmount || 0) + (order.coinDiscount || 0) - (order.deliveryCharge || 0) - 5);

            if (isSelfPickup) {
                earningsForShop = order.coinDiscount || 0;
            } else if (order.selfDelivery) {
                if (order.paymentType === 'PREPAID') {
                    earningsForShop = actualItemPrice + (order.deliveryCharge || 0);
                } else {
                    earningsForShop = order.coinDiscount || 0;
                }
            } else {
                earningsForShop = actualItemPrice;
            }
            return earningsForShop > 0;
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

        // Generate Razorpay Order
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const rpOrder = await rzp.orders.create({
            amount: Math.round(commissionAmount * 100), // paise
            currency: "INR",
            receipt: `commission_rcpt_${Date.now()}`
        });

        return res.render('pages/payCommissionWidget.ejs', {
            keyId: process.env.RAZORPAY_KEY_ID,
            rzpOrderId: rpOrder.id,
            amount: commissionAmount,
            shopId: shop._id,
            userName: req.user.name || req.user.username || "Shop Owner",
            userPhone: req.user.username || ""
        });

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

        // Find orders that resulted in a net debt (earnings < 0) for the shop
        const allPendingOrders = await Order.find({
            shopId: shopId,
            orderStatus: 'COMPLETED',
            settlementStatus: 'PENDING'
        });

        const unsettledOrders = allPendingOrders.filter(order => {
            let earningsForShop = 0;
            if (order.paymentType === 'PREPAID') {
                earningsForShop = (order.subtotalAmount || 0);
                if (order.selfDelivery && order.deliveryType === 'HOME_DELIVERY') {
                    earningsForShop += (order.deliveryCharge || 0);
                }
                if (order.selfDelivery) {
                    earningsForShop -= (order.pasrCommission || 0);
                } else if (order.deliveryPartnerId) {
                    earningsForShop -= (order.deliveryCharge || 0);
                }
            } else if (order.paymentType === 'COD') {
                earningsForShop = (order.coinDiscount || 0);
                if (order.selfDelivery) {
                    earningsForShop -= (order.pasrCommission || 0);
                } else if (order.deliveryPartnerId) {
                    earningsForShop -= (order.deliveryCharge || 0);
                }
            }
            return earningsForShop < 0;
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

        // Also update the shop's dueToPasr field to reflect the payment
        const shop = await Shop.findById(shopId);
        if (shop) {
            shop.dueToPasr = Math.max(0, (shop.dueToPasr || 0) - parseFloat(amount));
            await shop.save();
        }

        req.flash("success", `Payment of ₹${amount} successful. Commission debt cleared.`);
        res.redirect(`/shops/${shopId}`);

    } catch (error) {
        console.error("Verify Commission Error:", error);
        req.flash("error", "Error verifying payment, contact support if amount was deducted.");
        res.redirect(`/shops/${shopId}`);
    }
};

module.exports.createDonationOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid donation amount." });
        }

        const Razorpay = require('razorpay');
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const rzpOrder = await rzp.orders.create({
            amount: Math.round(amount * 100), // amount in paise
            currency: 'INR',
            receipt: `donate_${Date.now()}`
        });

        res.json({
            success: true,
            razorpay: {
                id: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (e) {
        console.error("Create Donation Order Error:", e);
        res.status(500).json({ success: false, message: "Could not initiate donation payment." });
    }
};

module.exports.verifyDonationPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        const crypto = require("crypto");
        const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment signature mismatch." });
        }

        // Successfully verified donation
        res.json({ success: true, message: "Thank you for your generous support!" });
    } catch (e) {
        console.error("Verify Donation Error:", e);
        res.status(500).json({ success: false, message: "Error verifying donation." });
    }
};
