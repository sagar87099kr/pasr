const express = require("express");
const router = express.Router();
const fcmController = require("../controllers/fcm");
const { isLogedin } = require("../middeleware");
const { doubleCsrfProtection } = require("../utils/csrf");

router.post("/save-customer-token", isLogedin, doubleCsrfProtection, fcmController.saveCustomerToken);
router.post("/save-shop-token", isLogedin, doubleCsrfProtection, fcmController.saveShopToken);


module.exports = router;
