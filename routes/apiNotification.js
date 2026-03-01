const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification");
const { isLogedin } = require("../middeleware");

router.get("/", isLogedin, notificationController.getNotifications);
router.post("/mark-read/:id", isLogedin, notificationController.markAsRead);
router.post("/mark-all-read", isLogedin, notificationController.markAllAsRead);

module.exports = router;
