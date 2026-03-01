const express = require("express");
const router = express.Router();
const fcmController = require("../controllers/fcm");
const { isLogedin } = require("../middeleware");

router.post("/save-customer-token", isLogedin, fcmController.saveCustomerToken);
router.post("/save-shop-token", isLogedin, fcmController.saveShopToken);

module.exports = router;
