const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const orderController = require("../controllers/order");
const { isLogedin, isVerifiedCustomer } = require("../middeleware");
const { doubleCsrfProtection } = require("../utils/csrf");

// Customer: Check Out & Create Order
router.post("/checkout", isLogedin, isVerifiedCustomer, doubleCsrfProtection, catchAsync(orderController.checkoutOrder));


// Customer: View their own orders
router.get("/my-orders", isLogedin, catchAsync(orderController.getCustomerOrders));

// Shopkeeper: View all orders for their shop(s)
router.get("/my-shop-orders", isLogedin, catchAsync(orderController.getShopOrders));

// Shop: Accept Order (COD)
router.post("/:id/accept", isLogedin, doubleCsrfProtection, catchAsync(orderController.shopAcceptOrder));


// Shop: Verify Prepaid Payment
router.post("/:id/verify-payment", isLogedin, doubleCsrfProtection, catchAsync(orderController.shopConfirmPayment));


// Shop: Mark order as Ready for Delivery
router.post("/:id/ready", isLogedin, doubleCsrfProtection, catchAsync(orderController.shopMarkReady));


// Shop: Deliver by themselves (self delivery)
router.post("/:id/self-deliver", isLogedin, doubleCsrfProtection, catchAsync(orderController.selfDeliver));


// Shop: Broadcast to all delivery partners
router.post("/:id/broadcast-delivery", isLogedin, doubleCsrfProtection, catchAsync(orderController.broadcastDelivery));


// Shop: Request Delivery (legacy alias → broadcast)
router.post("/:id/request-delivery", isLogedin, doubleCsrfProtection, catchAsync(orderController.broadcastDelivery));


// Delivery Partner: Claim a broadcast order
router.post("/:id/claim", isLogedin, doubleCsrfProtection, catchAsync(orderController.claimBroadcastOrder));


// Complete Order (OTP Verification)
router.post("/:id/complete", isLogedin, doubleCsrfProtection, catchAsync(orderController.completeOrder));


// Admin: Reset Shop Due
router.post("/admin/reset-shop-due/:shopId", isLogedin, doubleCsrfProtection, catchAsync(orderController.resetShopDue));


// Admin: Reset Partner Payout
router.post("/admin/reset-partner-payout/:partnerId", isLogedin, doubleCsrfProtection, catchAsync(orderController.resetPartnerPayout));


module.exports = router;

