const DeliveryPartner = require("../data/deliveryPartner");
const Order = require("../data/order");

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
