const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { isLogedin } = require("../middeleware.js");

// Verify payment initiated from the frontend widget
router.post("/verify-payment", isLogedin, paymentController.verifyPayment);
// Payout and Commission Settlement
router.post("/request-payout", isLogedin, paymentController.requestPayout);
router.post("/pay-commission", isLogedin, paymentController.payCommission);
router.post("/verify-commission", isLogedin, paymentController.verifyCommissionPayment);

// Donations
router.post("/donate/create-order", paymentController.createDonationOrder);
router.post("/donate/verify", paymentController.verifyDonationPayment);

module.exports = router;
