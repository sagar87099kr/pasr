const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/wrapAsync");
const cartController = require("../controllers/cart");
const { doubleCsrfProtection } = require("../utils/csrf");

// View Cart
router.get("/", cartController.viewCart);

// Add to Cart
router.post("/add", doubleCsrfProtection, catchAsync(cartController.addToCart));

// Remove from Cart
router.delete("/remove/:itemId", doubleCsrfProtection, cartController.removeFromCart);

// Update Quantity in Cart
router.put("/update/:itemId", doubleCsrfProtection, cartController.updateQuantity);

// Clear Cart
router.post("/clear", doubleCsrfProtection, cartController.clearCart);

// Calculate Delivery Fee Preview
router.post("/delivery-fee", doubleCsrfProtection, cartController.calculateDeliveryFee);


module.exports = router;
