const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const { isLogedin, isadmin } = require("../middeleware");
const { doubleCsrfProtection } = require("../utils/csrf");
const adminController = require("../controllers/admin");

// Admin Dashboard - View All Partners
router.get("/delivery-partners", isLogedin, isadmin, catchAsync(adminController.getAllPartners));

// Admin - Approve Partner
router.post("/delivery-partners/:id/approve", isLogedin, isadmin, doubleCsrfProtection, catchAsync(adminController.approvePartner));


// Admin - Block Partner
router.post("/delivery-partners/:id/block", isLogedin, isadmin, doubleCsrfProtection, catchAsync(adminController.blockPartner));


// Admin - View KYC Documents
router.get("/delivery-partners/:id/kyc", isLogedin, isadmin, catchAsync(adminController.viewKycDocuments));

// Admin - View All Orders
router.get("/orders", isLogedin, isadmin, catchAsync(adminController.getAllOrders));

// Admin - Force Cancel Order
router.post("/orders/:id/cancel", isLogedin, isadmin, doubleCsrfProtection, catchAsync(adminController.forceCancelOrder));


module.exports = router;
