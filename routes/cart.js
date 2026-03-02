const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const cartController = require("../controllers/cart");
const { isLogedin } = require("../middeleware");

// Apply login protection to all cart routes
router.use(isLogedin);

// View Cart
router.get("/", cartController.viewCart);

// Add to Cart
router.post("/add", catchAsync(cartController.addToCart));

// Remove from Cart
router.delete("/remove/:itemId", cartController.removeFromCart);

// Update Quantity in Cart
router.put("/update/:itemId", cartController.updateQuantity);

// Clear Cart
router.post("/clear", cartController.clearCart);

// Calculate Delivery Fee Preview
router.post("/delivery-fee", cartController.calculateDeliveryFee);


module.exports = router;
