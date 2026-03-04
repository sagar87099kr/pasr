const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment");
const { isLogedin } = require("../middeleware.js");

// Verify payment initiated from the frontend widget
router.post("/verify-payment", isLogedin, paymentController.verifyPayment);

module.exports = router;
