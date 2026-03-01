const DeliveryPartner = require("../data/deliveryPartner");
const Order = require("../data/order");
const User = require("../data/customers"); // Using Customer model as User reference
const { createNotification } = require("../utils/notificationHelper");

// Render Registration Form
module.exports.renderRegisterForm = (req, res) => {
    res.render("pages/deliveryPartnerRegister.ejs");
};

// Render Login Form
module.exports.renderLoginForm = (req, res) => {
    res.render("pages/deliveryLogin.ejs");
};

// Register a new delivery partner
module.exports.registerPartner = async (req, res, next) => {
    try {
        const { fullName, phoneNumber, dateOfBirth, address, workLocation, aadharNumber, panNumber, bankDetails, vehicleType, vehicleNumber } = req.body;

        // Process File Uploads (Cloudinary paths via Multer)
        const profilePhotoUrl = req.files && req.files['profilePhoto'] ? req.files['profilePhoto'][0].path : null;
        const aadharFrontUrl = req.files && req.files['aadharFront'] ? req.files['aadharFront'][0].path : null;
        const aadharBackUrl = req.files && req.files['aadharBack'] ? req.files['aadharBack'][0].path : null;
        const panCardUrl = req.files && req.files['panCard'] ? req.files['panCard'][0].path : null;
        const vehicleImageUrl = req.files && req.files['vehicleImage'] ? req.files['vehicleImage'][0].path : null;

        if (!profilePhotoUrl || !aadharFrontUrl || !aadharBackUrl || !panCardUrl || !vehicleImageUrl) {
            req.flash("danger", "Please upload all mandatory documents and photos.");
            return res.redirect("/delivery/register");
        }

        const documents = {
            aadharFront: aadharFrontUrl,
            aadharBack: aadharBackUrl,
            panCard: panCardUrl
        };

        const newPartner = new DeliveryPartner({
            user: req.user._id,
            fullName,
            phoneNumber,
            dateOfBirth,
            address,
            workLocation,
            documents,
            profilePhoto: profilePhotoUrl,
            vehicleImage: vehicleImageUrl,
            aadharNumber,
            panNumber,
            bankDetails,
            vehicleType,
            vehicleNumber
        });

        await newPartner.save();

        req.flash("success", "Registration successful! Your account is awaiting Admin approval.");
        res.redirect("/home"); // Redirect to home or a dedicated "Pending Approval" page
    } catch (e) {
        if (e.name === 'UserExistsError') { // Catch duplicate phone numbers
            req.flash("danger", "A user with the given phone number is already registered.");
            return res.redirect("/delivery/register");
        }
        console.error("Partner Registration Error:", e);
        if (e.errors) {
            Object.keys(e.errors).forEach(key => {
                console.error(`Validation Failed on ${key}: ${e.errors[key].message}`);
            });
        }
        req.flash("danger", "Failed to register. Please check your inputs and try again.");
        res.redirect("/delivery/register");
    }
};

// Login an existing delivery partner
module.exports.loginPartner = async (req, res, next) => {
    req.flash('success', 'Welcome back!');
    res.redirect('/delivery/dashboard');
};

// Partner gets their dashboard info
module.exports.getDashboard = async (req, res, next) => {
    try {
        const partner = req.deliveryPartner; // Provided by isDeliveryPartner middleware
        const partnerId = partner._id;

        // Fetch current active orders assigned to this partner
        const assignedOrders = await Order.find({
            deliveryPartnerId: partnerId,
            orderStatus: { $in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] }
        }).populate('shopId customerId');

        // Fetch all BROADCAST orders that are still unclaimed (any partner can claim them)
        const broadcastOrders = await Order.find({
            orderStatus: 'BROADCAST'
        }).populate('shopId customerId');

        res.render("pages/deliveryDashboard.ejs", { partner, activeOrders: assignedOrders, broadcastOrders });
    } catch (e) {
        next(e);
    }
}

// Partner toggles active status (online/offline)
module.exports.toggleActiveStatus = async (req, res, next) => {
    try {
        const { isActive } = req.body;
        const partner = req.deliveryPartner;

        if (!partner.isApproved) {
            return res.status(403).json({ success: false, message: "You must be approved by an Admin to go online." });
        }
        if (partner.isBlocked) {
            return res.status(403).json({ success: false, message: "Your account is blocked. Contact support." });
        }

        partner.isActive = isActive;
        await partner.save();

        res.status(200).json({ success: true, isActive: partner.isActive, message: `You are now ${isActive ? 'Online' : 'Offline'}` });
    } catch (e) {
        next(e);
    }
}

// Partner marks order as picked up
module.exports.markPickedUp = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const partner = req.deliveryPartner;
        const partnerId = partner._id;

        const order = await Order.findOne({ _id: orderId, deliveryPartnerId: partnerId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found or not assigned to you." });

        if (order.orderStatus !== 'ASSIGNED') {
            return res.status(400).json({ success: false, message: `Cannot pick up order. Current status: ${order.orderStatus}` });
        }

        order.orderStatus = 'OUT_FOR_DELIVERY';
        await order.save();

        // Notify Customer
        await createNotification(
            order.customerId,
            'ORDER_STATUS_UPDATE',
            order._id,
            'Out for Delivery',
            `Your order ${order.orderId} is out for delivery!`
        );

        res.status(200).json({ success: true, message: "Order marked as Out for Delivery", order });
    } catch (e) {
        next(e);
    }
};

// Partner verifies OTP to complete delivery
module.exports.verifyOTPAndComplete = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { otp } = req.body;
        const partner = req.deliveryPartner;
        const partnerId = partner._id;

        const order = await Order.findOne({ _id: orderId, deliveryPartnerId: partnerId });
        if (!order) return res.status(404).json({ success: false, message: "Order not found or not assigned to you." });

        if (order.orderStatus !== 'OUT_FOR_DELIVERY') {
            return res.status(400).json({ success: false, message: "Order must be OUT_FOR_DELIVERY to complete." });
        }

        if (order.deliveryOTP !== otp.toString()) {
            // Optional: Track failed attempts here
            return res.status(400).json({ success: false, message: "Invalid OTP. Please ask the customer for the correct code." });
        }

        // --- Financial Logic ---
        const Shop = require("../data/shops");
        const deliveryCharge = order.deliveryCharge || 0;
        const shop = await Shop.findById(order.shopId);

        // Case 1: Delivery Partner delivered (this is the partner dashboard, so we assume partner delivered)
        // Shop owes PASR 100% of delivery charge
        if (shop) {
            shop.dueToPasr = (shop.dueToPasr || 0) + Number(deliveryCharge.toFixed(2));
            await shop.save();
        }

        // Partner earns 70% of delivery charge
        const earnings = Number((deliveryCharge * 0.7).toFixed(2));
        partner.totalEarnings = (partner.totalEarnings || 0) + earnings;
        partner.pendingPayout = (partner.pendingPayout || 0) + earnings;
        partner.currentOrders = Math.max(0, (partner.currentOrders || 1) - 1);
        partner.totalDeliveries = (partner.totalDeliveries || 0) + 1;
        await partner.save();

        res.status(200).json({ success: true, message: "Delivery completed successfully! Earnings updated.", order });

    } catch (e) {
        next(e);
    }
};

// Partner requests payout (notifies admin)
module.exports.requestPayout = async (req, res, next) => {
    try {
        const partner = req.deliveryPartner;
        // In a real app, this would send an FCM to the admin or log a request
        // For now, we simulate success as the user requested "first implement then i will check"
        console.log(`Payout requested by partner: ${partner.fullName} (Pending: ₹${partner.pendingPayout})`);

        // Emit event for potential custom logic
        const orderBus = require("../events/eventBus");
        orderBus.emit("PAYOUT_REQUESTED", { partner });

        res.status(200).json({ success: true, message: "Payout request sent to Admin." });
    } catch (e) {
        next(e);
    }
};

// Partner confirms they received the money
module.exports.confirmReceipt = async (req, res, next) => {
    try {
        const partner = req.deliveryPartner;
        partner.pendingPayout = 0;
        await partner.save();

        res.status(200).json({ success: true, message: "Receipt confirmed. Pending balance reset." });
    } catch (e) {
        next(e);
    }
};
