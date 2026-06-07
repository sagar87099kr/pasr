const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const passport = require("passport");
const deliveryController = require("../controllers/delivery");
const multer = require("multer");
const { storage } = require("../cloud_con.js");
const { isLogedin, isDeliveryPartner, validateDeliveryPartner } = require("../middeleware.js");
const upload = multer({ storage });

// Login (Uses Standard Passport Strategy)
router.get("/login", deliveryController.renderLoginForm);
router.post("/login",

    passport.authenticate("local", {
        failureFlash: "Invalid phone number or password.",
        failureRedirect: '/delivery/login'
    }),
    catchAsync(deliveryController.loginPartner)
);

// Registration (requires customer to be logged in and OTP verified first)
router.get("/register", isLogedin, deliveryController.renderRegisterForm);
router.post("/register", isLogedin, upload.fields([

    { name: 'profilePhoto', maxCount: 1 },
    { name: 'aadharFront', maxCount: 1 },
    { name: 'aadharBack', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 }
]), validateDeliveryPartner, catchAsync(deliveryController.registerPartner));

// Toggle Online/Offline Status
router.post("/toggle-status", isDeliveryPartner, catchAsync(deliveryController.toggleActiveStatus));


// View Dashboard (Profile info + Assigned Orders)
router.get("/dashboard", isDeliveryPartner, catchAsync(deliveryController.getDashboard));

// Partner: Mark Order as Picked Up
router.post("/order/:orderId/picked-up", isDeliveryPartner, catchAsync(deliveryController.markPickedUp));


// Partner: Verify OTP and Complete Delivery
router.post("/order/:orderId/complete", isDeliveryPartner, catchAsync(deliveryController.verifyOTPAndComplete));


// Partner: Request Payout (notify admin)
router.post("/request-payout", isDeliveryPartner, catchAsync(deliveryController.requestPayout));


// Partner: Confirm Receipt of Payout (reset pending balance)
router.post("/confirm-receipt", isDeliveryPartner, catchAsync(deliveryController.confirmReceipt));


// Delivery calculation endpoint based on distance
router.get("/api/calculate", catchAsync(deliveryController.calculateDeliveryAPI));

module.exports = router;

