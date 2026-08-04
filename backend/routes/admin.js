const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const { isLogedin, isadmin } = require("../middeleware");
const adminController = require("../controllers/admin");

// Admin Dashboard - Metrics API
router.get("/dashboard", isLogedin, isadmin, catchAsync(async (req, res) => {
    const Order = require("../data/order");
    const DeliveryPartner = require("../data/deliveryPartner");
    const Customer = require("../data/customers");

    const orders = await Order.find();
    let totalOrders = orders.length;
    let cancelledOrders = 0;
    let revenue = 0;
    let delivered = 0;

    orders.forEach(order => {
        if (order.orderStatus === 'CANCELLED') cancelledOrders++;
        if (order.orderStatus === 'COMPLETED' || order.orderStatus === 'DELIVERED') {
            delivered++;
            revenue += order.totalAmount || 0;
        }
    });

    const activePartners = await DeliveryPartner.countDocuments({ isActive: true });
    const totalPartners = await DeliveryPartner.countDocuments();
    
    // Delivery Performance Mock
    const averageDeliveryTime = "45 mins"; 

    res.json({
        success: true,
        dashboard: {
            totalOrders,
            delivered,
            cancelledOrders,
            revenue,
            activePartners,
            totalPartners,
            averageDeliveryTime,
            customerComplaints: 0 // Placeholder
        }
    });
}));

// Admin Dashboard - View All Partners
router.get("/delivery-partners", isLogedin, isadmin, catchAsync(adminController.getAllPartners));

// Admin - Approve Partner
router.post("/delivery-partners/:id/approve", isLogedin, isadmin, catchAsync(adminController.approvePartner));


// Admin - Block Partner
router.post("/delivery-partners/:id/block", isLogedin, isadmin, catchAsync(adminController.blockPartner));


// Admin - Assign Bazaar
router.post("/delivery-partners/:id/bazaar", isLogedin, isadmin, catchAsync(adminController.assignBazaarToPartner));

// Admin - Toggle Active Status
router.post("/delivery-partners/:id/toggle-active", isLogedin, isadmin, catchAsync(adminController.togglePartnerActive));

// Admin - View KYC Documents
router.get("/delivery-partners/:id/kyc", isLogedin, isadmin, catchAsync(adminController.viewKycDocuments));

// Admin - View All Orders
router.get("/orders", isLogedin, isadmin, catchAsync(adminController.getAllOrders));

// Admin - Verify Order
router.post("/orders/:id/verify", isLogedin, isadmin, catchAsync(adminController.verifyOrder));

// Admin - Force Cancel Order
router.post("/orders/:id/cancel", isLogedin, isadmin, catchAsync(adminController.forceCancelOrder));

// Admin - Payouts Management
router.get("/payouts", isLogedin, isadmin, catchAsync(adminController.getPayoutRequests));
router.post("/payouts/:id/approve", isLogedin, isadmin, catchAsync(adminController.approvePayout));

const adminBazaarController = require("../controllers/adminBazaar");

// Admin - Bazaar Management
router.get("/bazaars", isLogedin, isadmin, catchAsync(adminBazaarController.getBazaars));
router.post("/bazaars", isLogedin, isadmin, catchAsync(adminBazaarController.createBazaar));

// Admin - Assign Bazaars to Shops and Providers
router.post("/shops/:id/assign-bazaar", isLogedin, isadmin, catchAsync(adminBazaarController.assignBazaarToShop));
router.post("/providers/:id/assign-bazaar", isLogedin, isadmin, catchAsync(adminBazaarController.assignBazaarToProvider));

// Admin - Toggle Sponsored Status
router.post("/shops/:id/toggle-sponsor", isLogedin, isadmin, catchAsync(async (req, res) => {
    const Shop = require("../data/shops");
    const shop = await Shop.findById(req.params.id);
    if (shop) {
        shop.isSponsored = req.body.isSponsored === 'on';
        await shop.save();
        req.flash("success", "Shop sponsored status updated!");
    }
    res.redirect("/shops/verify");
}));

module.exports = router;
