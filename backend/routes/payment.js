const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { isLogedin } = require("../middeleware.js");

// Server-to-Server Webhook (Called by Razorpay on payment.captured / order.paid)
router.post("/webhook", paymentController.handleWebhook);

// Verify payment initiated from the frontend/mobile client
router.post("/verify-payment", paymentController.verifyPayment);

// Real-time order reconciliation endpoint
router.post("/reconcile/:orderId", paymentController.reconcileOrder);

// Payout and Commission Settlement
router.post("/request-payout", isLogedin, paymentController.requestPayout);
router.post("/pay-commission", isLogedin, paymentController.payCommission);
router.post("/verify-commission", isLogedin, paymentController.verifyCommissionPayment);

// Donations
router.post("/donate/create-order", paymentController.createDonationOrder);
router.post("/donate/verify", paymentController.verifyDonationPayment);

// Penalty
router.post("/penalty/create", isLogedin, paymentController.createPenaltyPayment);
router.post("/penalty/verify", isLogedin, paymentController.verifyPenaltyPayment);

module.exports = router;
