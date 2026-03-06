const crypto = require("crypto");
const Order = require("../data/order");
const orderBus = require("../events/eventBus");

module.exports.verifyPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing required payment details." });
        }

        // Verify the signature
        const secret = process.env.RAZORPAY_KEY_SECRET;

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

        // Lookup pending order from session!
        const orderData = req.session.pendingOrders && req.session.pendingOrders[razorpay_order_id];

        if (!orderData) {
            return res.status(404).json({ success: false, message: "Order session expired or not found." });
        }

        // 1. Re-check and decrement inventory ATOMICALLY
        const Item = require("../data/item");
        const inventoryUpdates = [];
        for (let item of orderData.items) {
            const result = await Item.updateOne(
                { _id: item.itemId, quantity: { $gte: item.quantity } },
                { $inc: { quantity: -item.quantity } }
            );
            if (result.modifiedCount === 0) {
                // Out of stock NOW! Rollback!
                for (let revert of inventoryUpdates) {
                    await Item.updateOne({ _id: revert.id }, { $inc: { quantity: revert.qty } });
                }
                // Issue a refund via Razorpay!
                const Razorpay = require('razorpay');
                const rzp = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET
                });
                await rzp.payments.refund(razorpay_payment_id, { amount: Math.round(orderData.totalAmount * 100) });

                // Clear pending order
                delete req.session.pendingOrders[razorpay_order_id];
                req.session.save(); // Save the deletion
                return res.status(400).json({ success: false, message: "Items sold out during payment. A refund has been issued." });
            }
            inventoryUpdates.push({ id: item.itemId, qty: item.quantity });
        }

        // 2. Create the Order Document!
        const Order = require("../data/order");
        orderData.paymentStatus = 'VERIFIED';
        orderData.razorpayPaymentId = razorpay_payment_id;
        orderData.razorpaySignature = razorpay_signature;

        // Remove session-only flag before saving to DB
        const grantFreeDelivery = orderData.grantFreeDelivery;
        delete orderData.grantFreeDelivery;

        const order = new Order(orderData);
        await order.save();

        if (grantFreeDelivery) {
            const FreeDeliveryUsage = require("../data/freeDeliveryUsage");
            await FreeDeliveryUsage.create({ mobile: String(req.user.username), usedAt: new Date() });
        }

        // 3. Clear Cart for this shop and Pending Order
        const cart = req.session.cart;
        if (cart) {
            cart.items = cart.items.filter(item => item.shopId !== orderData.shopId);
            cart.subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
            cart.shopId = cart.items.length === 0 ? null : cart.shopId;
        }
        delete req.session.pendingOrders[razorpay_order_id];

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

const TransactionHistory = require("../data/transactionHistory");
const Shop = require("../data/shops");
const Razorpay = require("razorpay");

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

        // Filter orders that actually owe the shop money
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

        // 2. Initialize Razorpay API
        const razorpayParams = {
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        };
        const rzp = new Razorpay(razorpayParams);

        // We will generate a reference ID for our own tracking
        const payoutReference = `payout_${shop._id}_${Date.now()}`;

        try {
            // STEP A: Create a Contact for the Shop Owner
            // Razorpay limits name to 50 chars natively
            const contactData = {
                name: (req.user.name || "Shop Owner").substring(0, 50),
                contact: req.user.phone || shop.phone || "9999999999",
                type: "vendor",
                reference_id: `shop_${shop._id}`
            };
            const contact = await rzp.contacts.create(contactData);

            // STEP B: Create a Fund Account using their UPI ID
            const fundAccountData = {
                contact_id: contact.id,
                account_type: "vpa",
                vpa: {
                    address: shop.upiId
                }
            };
            const fundAccount = await rzp.fundAccount.create(fundAccountData);

            // STEP C: Issue the Payout
            const payoutOptions = {
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || "2323230009695627", // Test merchant account for RazorpayX by default for new accts, or should be in ENV
                fund_account_id: fundAccount.id,
                amount: Math.round(payoutAmount * 100), // convert to paise
                currency: "INR",
                mode: "UPI",
                purpose: "payout",
                queue_if_low_balance: true,
                reference_id: payoutReference,
                narration: "PASR Shop Earnings"
            };

            const payoutResponse = await rzp.payouts.create(payoutOptions);

            // 3. Create Transaction History (Successful Request)
            await TransactionHistory.create({
                shopId: shop._id,
                type: 'PAYOUT_TO_SHOP',
                amount: payoutAmount,
                status: payoutResponse.status === 'processed' || payoutResponse.status === 'processing' || payoutResponse.status === 'queued' ? 'SUCCESS' : 'PENDING',
                metadata: {
                    upiId: shop.upiId,
                    ordersSettled: orderIds,
                    razorpayPayoutId: payoutResponse.id,
                    razorpayFundAccountId: fundAccount.id,
                    razorpayContactId: contact.id
                }
            });

            // 4. Mark Orders as Settled Instantly
            await Order.updateMany(
                { _id: { $in: payoutOrders.map(o => o._id) } },
                { $set: { settlementStatus: 'SETTLED' } }
            );

            req.flash("success", `Success! ₹${payoutAmount} transferred to ${shop.upiId} via Razorpay.`);
        } catch (rzpError) {
            console.error("Razorpay Payout API Error:", rzpError);

            // Log the failure in history but don't settle orders
            await TransactionHistory.create({
                shopId: shop._id,
                type: 'PAYOUT_TO_SHOP',
                amount: payoutAmount,
                status: 'FAILED',
                metadata: {
                    upiId: shop.upiId,
                    error: rzpError.message || "Razorpay API Failure"
                }
            });

            req.flash("error", "Razorpay Transfer Failed: " + (rzpError.error?.description || rzpError.message || "Check your UPI ID or PASR balance."));
        }

        res.redirect(`/shops/${shopId}`);

    } catch (error) {
        console.error("Payout Request Error:", error);
        req.flash("error", "Failed to process payout request.");
        res.redirect("back");
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
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const rzpOrder = await rzp.orders.create({
            amount: Math.round(commissionAmount * 100), // convert to paise
            currency: "INR",
            receipt: `comm_${shopId}_${Date.now()}`
        });

        // We render a special EJS page that automatically opens the Razorpay widget to pay PASR
        res.render("pages/payCommissionWidget", {
            shopId: shop._id,
            amount: commissionAmount,
            rzpOrderId: rzpOrder.id,
            keyId: process.env.RAZORPAY_KEY_ID,
            userName: req.user.name || req.user.username,
            userPhone: req.user.username
        });

    } catch (error) {
        console.error("Pay Commission Error:", error);
        req.flash("error", "Failed to initiate payment. Please try again later.");
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

        const secret = process.env.RAZORPAY_KEY_SECRET;
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
