const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification");
const { isLogedin } = require("../middeleware");
const { doubleCsrfProtection } = require("../utils/csrf");

router.get("/", isLogedin, notificationController.getNotifications);
router.post("/mark-read/:id", isLogedin, doubleCsrfProtection, notificationController.markAsRead);
router.post("/mark-all-read", isLogedin, doubleCsrfProtection, notificationController.markAllAsRead);


module.exports = router;
