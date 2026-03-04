const Item = require("../data/item");
const Shop = require("../data/shops");
const distanceUtil = require("../utils/distance");
const chargeUtil = require("../utils/deliveryCharge");
const FreeDeliveryUsage = require("../data/freeDeliveryUsage");

// Initialize cart if it doesn't exist
const initCart = (req) => {
    if (!req.session.cart) {
        req.session.cart = {
            shopId: null,
            items: [],
            subtotal: 0
        };
    }
};

// Calculate cart subtotal
const calculateSubtotal = (cart) => {
    cart.subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Add item to cart
module.exports.addToCart = async (req, res, next) => {
    try {
        initCart(req);

        const { itemId, quantity, itemImage, shopName } = req.body;
        const parsedQuantity = parseInt(quantity || 1, 10);

        if (parsedQuantity <= 0) {
            return res.status(400).json({ success: false, message: "Quantity must be greater than zero." });
        }

        let item = await Item.findById(itemId).populate({
            path: 'shop',
            populate: {
                path: 'owner'
            }
        });

        let isProduct = false;
        if (!item) {
            // Check if it's a Local Bazar Product
            const Product = require("../data/product");
            item = await Product.findById(itemId).populate('owner');
            if (item) isProduct = true;
        }

        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found." });
        }

        let shopId, finalShopName, shopUpiUrl, shopOwnerUsername;

        if (isProduct) {
            shopId = item.owner._id.toString();
            finalShopName = `Local Bazar: ${item.owner.name}`;
            shopUpiUrl = item.upiScanner ? item.upiScanner.url : null;
            shopOwnerUsername = item.owner.username;
        } else {
            if (!item.shop) {
                return res.status(404).json({ success: false, message: "Shop associated with this item not found." });
            }
            shopId = item.shop._id.toString();
            finalShopName = shopName || item.shop.shopName || 'Local Shop';
            shopUpiUrl = item.shop.upiScanner ? item.shop.upiScanner.url : null;
            shopOwnerUsername = item.shop.owner ? item.shop.owner.username : null;
        }

        const cart = req.session.cart;

        // MULTI-SHOP CART: We no longer restrict to one shop.
        // We store shop details within each item for grouping in the view.

        const existingItemIndex = cart.items.findIndex(i => i.itemId === itemId);

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += parsedQuantity;
        } else {
            cart.items.push({
                itemId: item._id,
                name: isProduct ? item.productName : item.name,
                price: item.price,
                quantity: parsedQuantity,
                image: itemImage || (isProduct ? (item.productImage[0] ? item.productImage[0].url : '') : (item.img && item.img.url ? item.img.url : '')),
                shopId: shopId,
                shopName: finalShopName,
                shopUpiUrl: shopUpiUrl,
                shopOwnerUsername: shopOwnerUsername
            });
        }

        calculateSubtotal(cart);
        req.flash("success", "Item added to cart");
        console.log("[CART] Adding item. Current session ID:", req.sessionID);
        console.log("[CART] Cart to save:", JSON.stringify(cart, null, 2));
        req.session.save((err) => {
            if (err) console.error("[CART] Save error:", err);
            else console.log("[CART] Save callback success!");
            res.status(200).json({ success: true, message: "Item added to cart", cart });
        });
    } catch (e) {
        next(e);
    }
};

// View Cart
module.exports.viewCart = (req, res) => {
    console.log("[CART] Viewing cart. Current session ID:", req.sessionID);
    console.log("[CART] Before initCart:", req.session.cart ? JSON.stringify(req.session.cart.items.length) + " items" : "No cart");
    initCart(req);
    console.log("[CART] After initCart:", JSON.stringify(req.session.cart, null, 2));
    // Render an EJS page
    res.render("pages/cart", { cart: req.session.cart });
};

// Remove item from cart
module.exports.removeFromCart = (req, res) => {
    initCart(req);
    const { itemId } = req.params;

    const cart = req.session.cart;
    cart.items = cart.items.filter(i => String(i.itemId) !== String(itemId));

    // Clear shopId if cart is completely empty
    if (cart.items.length === 0) {
        cart.shopId = null;
    }

    calculateSubtotal(cart);
    req.flash("success", "Item removed from cart");
    req.session.save(() => {
        res.status(200).json({ success: true, message: "Item removed", cart });
    });
};

// Update item quantity in cart
module.exports.updateQuantity = (req, res) => {
    initCart(req);
    const { itemId } = req.params;
    const { action } = req.body; // 'increase' or 'decrease'

    const cart = req.session.cart;
    const itemIndex = cart.items.findIndex(i => String(i.itemId) === String(itemId));

    if (itemIndex > -1) {
        if (action === 'increase') {
            cart.items[itemIndex].quantity += 1;
        } else if (action === 'decrease') {
            cart.items[itemIndex].quantity -= 1;
            if (cart.items[itemIndex].quantity <= 0) {
                // Remove item entirely
                cart.items = cart.items.filter(i => i.itemId !== itemId);
            }
        }

        // Clear shopId if cart is completely empty
        if (cart.items.length === 0) {
            cart.shopId = null;
        }

        calculateSubtotal(cart);
        req.session.save(() => {
            res.status(200).json({ success: true, message: "Quantity updated", cart });
        });
    } else {
        res.status(404).json({ success: false, message: "Item not found in cart" });
    }
};

// Clear entire cart
module.exports.clearCart = (req, res) => {
    req.session.cart = {
        shopId: null,
        items: [],
        subtotal: 0
    };
    req.flash("success", "All items removed from cart");
    req.session.save(() => {
        res.status(200).json({ success: true, message: "Cart cleared" });
    });
};

// Calculate delivery fee dynamically for the cart preview
module.exports.calculateDeliveryFee = async (req, res, next) => {
    try {
        const cart = req.session.cart;
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }

        const { lat, lng, shopId } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: "Location coordinates required." });
        }

        if (!shopId) {
            return res.status(400).json({ success: false, message: "Shop ID required." });
        }

        let shop = await Shop.findById(shopId);
        let sLoc;

        if (shop && shop.geometry && shop.geometry.coordinates) {
            sLoc = shop.geometry.coordinates; // [lng, lat]
        } else {
            // Check if it's a Local Bazar Seller (stored as shopId which is owner._id)
            const Product = require("../data/product");
            const product = await Product.findOne({ owner: shopId });
            if (product && product.geometry && product.geometry.coordinates) {
                sLoc = product.geometry.coordinates;
            }
        }

        if (!sLoc) {
            return res.status(404).json({ success: false, message: "Shop location not found." });
        }

        // distanceUtil expects (lat1, lon1, lat2, lon2, useGoogle)
        const distanceInKm = await distanceUtil.calculateDistance(
            parseFloat(lat), parseFloat(lng),
            sLoc[1], sLoc[0],
            true
        );

        if (distanceInKm > 5) {
            return res.status(400).json({
                success: false,
                message: "Unable to deliver to your location for now"
            });
        }

        const deliveryCharge = chargeUtil.calculateDeliveryCharge(distanceInKm);

        // Subtotal for THIS shop
        const shopSubtotal = cart.items
            .filter(i => i.shopId === shopId)
            .reduce((acc, i) => acc + (i.price * i.quantity), 0);

        // Check first-order free delivery eligibility by mobile number
        let isFirstOrder = false;
        if (req.user && req.user.username) {
            const existing = await FreeDeliveryUsage.findOne({ mobile: String(req.user.username) });
            if (!existing) isFirstOrder = true;
        }

        const effectiveDeliveryCharge = isFirstOrder ? 0 : deliveryCharge;

        res.status(200).json({
            success: true,
            distance: distanceInKm.toFixed(1),
            deliveryCharge,
            effectiveDeliveryCharge,
            isFirstOrder,
            subtotal: shopSubtotal,
            total: shopSubtotal + effectiveDeliveryCharge
        });
    } catch (e) {
        next(e);
    }
};
