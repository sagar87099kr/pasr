const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const orderController = require("../controllers/order");
const { isLogedin, isVerifiedCustomer } = require("../middeleware");

// Customer: Check Out & Create Order
router.post("/checkout", isLogedin, isVerifiedCustomer, catchAsync(orderController.checkoutOrder));


// Customer: View their own orders
router.get("/my-orders", isLogedin, catchAsync(orderController.getCustomerOrders));

// Shopkeeper: View all orders for their shop(s)
router.get("/my-shop-orders", isLogedin, catchAsync(orderController.getShopOrders));

// Shop: Accept Order (COD)
router.post("/:id/accept", isLogedin, catchAsync(orderController.shopAcceptOrder));


// Shop: Verify Prepaid Payment
router.post("/:id/verify-payment", isLogedin, catchAsync(orderController.shopConfirmPayment));


// Shop: Mark order as Ready for Delivery
router.post("/:id/ready", isLogedin, catchAsync(orderController.shopMarkReady));


// Shop: Deliver by themselves (self delivery)
router.post("/:id/self-deliver", isLogedin, catchAsync(orderController.selfDeliver));


// Shop: Broadcast to all delivery partners
router.post("/:id/broadcast-delivery", isLogedin, catchAsync(orderController.broadcastDelivery));


// Shop: Request Delivery (legacy alias → broadcast)
router.post("/:id/request-delivery", isLogedin, catchAsync(orderController.broadcastDelivery));


// Delivery Partner: Claim a broadcast order
router.post("/:id/claim", isLogedin, catchAsync(orderController.claimBroadcastOrder));


// Complete Order (OTP Verification)
router.post("/:id/complete", isLogedin, catchAsync(orderController.completeOrder));


// Admin: Reset Shop Due
router.post("/admin/reset-shop-due/:shopId", isLogedin, catchAsync(orderController.resetShopDue));


// Admin: Reset Partner Payout
router.post("/admin/reset-partner-payout/:partnerId", isLogedin, catchAsync(orderController.resetPartnerPayout));


module.exports = router;

