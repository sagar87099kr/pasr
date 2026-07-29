const DeliveryPartner = require("../data/deliveryPartner");
const Bazaar = require("../data/bazaar");
const Order = require("../data/order");
const Shop = require("../data/shops");
const orderBus = require("../events/eventBus");

// View all delivery partners
module.exports.getAllPartners = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const totalPartners = await DeliveryPartner.countDocuments({});
        const partners = await DeliveryPartner.find({}).populate('bazaar').sort({ createdAt: -1 }).skip(skip).limit(limit);
        const bazaars = await Bazaar.find({ isActive: true }).sort({ name: 1 });
        const totalPages = Math.ceil(totalPartners / limit);

        res.locals.containerClass = 'container-fluid w-100 p-3 p-md-5 m-0';
        res.render('pages/adminDeliveryPartners.ejs', { partners, bazaars, currentPage: page, totalPages });
    } catch (e) {
        next(e);
    }
};

// Assign Bazaar to a delivery partner
module.exports.assignBazaarToPartner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { bazaarId } = req.body;
        
        if (!bazaarId) {
            await DeliveryPartner.findByIdAndUpdate(id, { $unset: { bazaar: 1 } });
            req.flash("success", "Bazaar assignment removed.");
        } else {
            await DeliveryPartner.findByIdAndUpdate(id, { bazaar: bazaarId });
            req.flash("success", "Bazaar successfully assigned.");
        }
        res.redirect("/admin/delivery-partners");
    } catch (e) {
        req.flash("error", "Failed to update bazaar assignment.");
        res.redirect("/admin/delivery-partners");
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
        res.redirect("back");
    } catch (e) {
        next(e);
    }
};

// Toggle block status for a delivery partner
module.exports.blockPartner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findById(id);
        if (!partner) {
            req.flash("danger", "Delivery Partner not found.");
            return res.redirect("back");
        }
        partner.isBlocked = !partner.isBlocked;
        await partner.save();
        req.flash("success", `Delivery Partner has been ${partner.isBlocked ? 'blocked' : 'unblocked'}.`);
        res.redirect("back");
    } catch (e) {
        next(e);
    }
};

// Toggle active status for delivery partner
module.exports.togglePartnerActive = async (req, res, next) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findById(id);
        if (!partner) {
            req.flash("danger", "Delivery Partner not found.");
            return res.redirect("back");
        }
        partner.isActive = !partner.isActive;
        await partner.save();
        req.flash("success", `Delivery Partner set to ${partner.isActive ? 'Online' : 'Offline'}.`);
        res.redirect("back");
    } catch (e) {
        next(e);
    }
};

// Verify Order
module.exports.verifyOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) {
            req.flash("danger", "Order not found.");
            return res.redirect("/admin/orders");
        }
        order.adminVerified = true;
        await order.save();
        req.flash("success", `Order #${order.orderId} verified successfully and sent to shop!`);
        res.redirect("/admin/orders");
    } catch (e) {
        next(e);
    }
};

// View all orders
module.exports.getAllOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const query = { $nor: [{ paymentType: 'PREPAID', paymentStatus: 'PENDING' }] };
        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('customerId')
            .populate({
                path: 'shopId',
                populate: { path: 'owner' }
            })
            .populate('deliveryPartnerId')
            .populate('items.itemId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Compute stats using countDocuments for accurate dashboard totals
        const deliveredOrders = await Order.countDocuments({ ...query, orderStatus: 'COMPLETED' });
        const cancelledOrders = await Order.countDocuments({ ...query, orderStatus: 'CANCELLED' });
        const activeOrders = totalOrders - deliveredOrders - cancelledOrders;

        const totalPages = Math.ceil(totalOrders / limit);

        res.locals.containerClass = 'container-fluid w-100 p-3 p-md-5 m-0';
        res.render('pages/adminOrders.ejs', {
            orders,
            stats: { totalOrders, deliveredOrders, cancelledOrders, activeOrders },
            currentPage: page, totalPages
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
            return res.redirect("/admin/orders");
        }

        // If order was assigned, decrement partner's current orders
        if (order.deliveryPartnerId) {
            await DeliveryPartner.findByIdAndUpdate(order.deliveryPartnerId, {
                $inc: { currentOrders: -1 }
            });
        }

        orderBus.emit("ORDER_CANCELLED", order);
        req.flash("success", "Order cancelled successfully.");
        res.redirect("/admin/orders");
    } catch (e) {
        next(e);
    }
};

// Admin - View KYC Documents
module.exports.viewKycDocuments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findById(id).populate('bazaar');
        if (!partner) {
            req.flash("error", "Partner not found.");
            return res.redirect("/admin/delivery-partners");
        }
        res.locals.containerClass = 'container-fluid w-100 p-3 p-md-5 m-0';
        res.render('pages/adminDeliveryPartnerKyc.ejs', { partner });
    } catch (e) {
        next(e);
    }
};

const TransactionHistory = require("../data/transactionHistory");

module.exports.getPayoutRequests = async (req, res, next) => {
    try {
        if (String(req.user.username) !== '8709956547') {
            req.flash("error", "Unauthorized: Only the super-admin (8709956547) can manage payouts.");
            return res.redirect("/home");
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const totalPending = await TransactionHistory.countDocuments({ 
            type: { $in: ['PAYOUT_TO_SHOP', 'PAYOUT_TO_DELIVERY_PARTNER'] }, 
            status: 'PENDING' 
        });
        const requests = await TransactionHistory.find({
            type: { $in: ['PAYOUT_TO_SHOP', 'PAYOUT_TO_DELIVERY_PARTNER'] },
            status: 'PENDING'
        }).populate({
            path: 'shopId',
            populate: { path: 'owner' }
        }).populate('deliveryPartnerId').sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalPages = Math.ceil(totalPending / limit);

        const settledRequests = await TransactionHistory.find({
            type: { $in: ['PAYOUT_TO_SHOP', 'PAYOUT_TO_DELIVERY_PARTNER'] },
            status: 'SUCCESS'
        }).populate({
            path: 'shopId',
            populate: { path: 'owner' }
        }).populate('deliveryPartnerId').sort({ updatedAt: -1 }).limit(20);

        res.render('pages/adminPayouts.ejs', { 
            requests,
            settledRequests,
            currentPage: page, totalPages,
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

        if (transaction.type === 'PAYOUT_TO_SHOP') {
            const shop = await Shop.findById(transaction.shopId);
            if (shop) {
                shop.pendingPayout = Math.max(0, (shop.pendingPayout || 0) - transaction.amount);
                await shop.save();
            }
        } else if (transaction.type === 'PAYOUT_TO_DELIVERY_PARTNER') {
            const partner = await DeliveryPartner.findById(transaction.deliveryPartnerId);
            if (partner) {
                partner.pendingPayout = Math.max(0, (partner.pendingPayout || 0) - transaction.amount);
                await partner.save();
            }
        }

        // 1. Mark transaction as SUCCESS
        transaction.status = 'SUCCESS';
        transaction.metadata = {
            ...(transaction.metadata || {}),
            approvedAt: new Date(),
            approvedBy: req.user.username
        };
        transaction.markModified('metadata');
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
