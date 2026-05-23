const DeliveryPartner = require("../data/deliveryPartner");
const Order = require("../data/order");
const orderBus = require("../events/eventBus");

// View all delivery partners
module.exports.getAllPartners = async (req, res, next) => {
    try {
        const partners = await DeliveryPartner.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, partners });
    } catch (e) {
        next(e);
    }
};

// Approve a delivery partner
module.exports.approvePartner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findByIdAndUpdate(id, { isApproved: true }, { new: true });
        if (!partner) {
            req.flash("danger", "Delivery Partner not found.");
            return res.redirect("back"); // Adjust route based on frontend
        }
        res.status(200).json({ success: true, message: "Partner approved successfully.", partner });
    } catch (e) {
        next(e);
    }
};

// Block a delivery partner
module.exports.blockPartner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findByIdAndUpdate(id, { isBlocked: true }, { new: true });
        if (!partner) {
            req.flash("danger", "Delivery Partner not found.");
            return res.redirect("back");
        }
        res.status(200).json({ success: true, message: "Partner blocked successfully.", partner });
    } catch (e) {
        next(e);
    }
};

// View all orders
module.exports.getAllOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({
            $nor: [{ paymentType: 'PREPAID', paymentStatus: 'PENDING' }]
        })
            .populate('customerId')
            .populate({
                path: 'shopId',
                populate: { path: 'owner' }
            })
            .populate('deliveryPartnerId')
            .sort({ createdAt: -1 });
        // Compute stats
        let totalOrders = orders.length;
        let deliveredOrders = 0;
        let cancelledOrders = 0;
        let activeOrders = 0;

        orders.forEach(o => {
            if (o.orderStatus === 'COMPLETED') deliveredOrders++;
            else if (o.orderStatus === 'CANCELLED') cancelledOrders++;
            else activeOrders++;
        });

        res.locals.containerClass = 'container-fluid w-100 p-3 p-md-5 m-0';
        res.render('pages/adminOrders.ejs', {
            orders,
            stats: { totalOrders, deliveredOrders, cancelledOrders, activeOrders }
        });
    } catch (e) {
        next(e);
    }
};

// Force cancel an order
module.exports.forceCancelOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const order = await Order.findByIdAndUpdate(id, {
            orderStatus: 'CANCELLED',
            cancellationReason: reason || "Cancelled by Admin"
        }, { new: true });

        if (!order) {
            req.flash("danger", "Order not found.");
            return res.redirect("back");
        }

        // If order was assigned, decrement partner's current orders
        if (order.deliveryPartnerId) {
            await DeliveryPartner.findByIdAndUpdate(order.deliveryPartnerId, {
                $inc: { currentOrders: -1 }
            });
        }

        orderBus.emit("ORDER_CANCELLED", order);
        res.status(200).json({ success: true, message: "Order cancelled.", order });
    } catch (e) {
        next(e);
    }
};

// View KYC Documents
module.exports.viewKycDocuments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findById(id).select('documents aadharNumber panNumber bankDetails');
        if (!partner) {
            return res.status(404).json({ success: false, message: "Partner not found." });
        }
        res.status(200).json({ success: true, kyc: partner });
    } catch (e) {
        next(e);
    }
};

const TransactionHistory = require("../data/transactionHistory");

// Admin Payouts Management (Restricted to 8709956547)
module.exports.getPayoutRequests = async (req, res, next) => {
    try {
        if (String(req.user.username) !== '8709956547') {
            req.flash("error", "Unauthorized: Only the super-admin (8709956547) can manage payouts.");
            return res.redirect("/home");
        }

        const requests = await TransactionHistory.find({
            type: 'PAYOUT_TO_SHOP',
            status: 'PENDING'
        }).populate({
            path: 'shopId',
            populate: { path: 'owner' }
        }).sort({ createdAt: -1 });

        const settledRequests = await TransactionHistory.find({
            type: 'PAYOUT_TO_SHOP',
            status: 'SUCCESS'
        }).populate({
            path: 'shopId',
            populate: { path: 'owner' }
        }).sort({ updatedAt: -1 }).limit(100);

        res.render('pages/adminPayouts.ejs', { 
            requests,
            settledRequests,
            containerClass: 'container-fluid mt-4 px-4'
        });
    } catch (e) {
        next(e);
    }
};

module.exports.approvePayout = async (req, res, next) => {
    try {
        if (String(req.user.username) !== '8709956547') {
            return res.status(403).json({ success: false, message: "Unauthorized." });
        }

        const { id } = req.params;
        const transaction = await TransactionHistory.findById(id);

        if (!transaction || transaction.status !== 'PENDING') {
            return res.status(404).json({ success: false, message: "Pending transaction not found." });
        }

        // 1. Mark transaction as SUCCESS
        transaction.status = 'SUCCESS';
        transaction.metadata = {
            ...transaction.metadata,
            approvedAt: new Date(),
            approvedBy: req.user.username
        };
        await transaction.save();

        // 2. Mark associated orders as SETTLED
        if (transaction.metadata && transaction.metadata.ordersSettled) {
            await Order.updateMany(
                { orderId: { $in: transaction.metadata.ordersSettled } },
                { $set: { settlementStatus: 'SETTLED' } }
            );
        }

        res.status(200).json({ success: true, message: "Payout marked as settled." });
    } catch (e) {
        next(e);
    }
};
