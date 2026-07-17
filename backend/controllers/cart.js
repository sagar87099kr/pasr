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
            populate: [
                { path: 'owner' },
                { path: 'bazaar' }
            ]
        });

        let isProduct = false;
        if (!item) {
            // Check if it's a Local Bazar Product
            const Product = require("../data/product");
            item = await Product.findById(itemId).populate('owner').populate('bazaar');
            if (item) isProduct = true;
        }

        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found." });
        }

        let shopId, finalShopName, shopUpiId, shopOwnerUsername, bazaarName, shopLocation;

        if (isProduct) {
            shopId = item.owner._id.toString();
            finalShopName = `Local Bazar: ${item.owner.name}`;
            shopUpiId = item.upiId || null;
            shopOwnerUsername = item.owner.username;
            bazaarName = item.bazaar ? item.bazaar.bazaarName : null;
            shopLocation = null; // Products might not have a strict location field on owner
        } else {
            if (!item.shop) {
                return res.status(404).json({ success: false, message: "Shop associated with this item not found." });
            }
            shopId = item.shop._id.toString();
            finalShopName = shopName || item.shop.shopName || 'Local Shop';
            shopUpiId = item.shop.upiId || null;
            shopOwnerUsername = item.shop.owner ? item.shop.owner.username : null;
            bazaarName = item.shop.bazaar ? item.shop.bazaar.bazaarName : null;
            shopLocation = item.shop.location || null;
        }

        const cart = req.session.cart;

        // MULTI-SHOP CART: We no longer restrict to one shop.
        // But we MUST check if the shop is currently open/active.
        if (!isProduct && item.shop) {
            const shop = item.shop;
            const now = new Date();
            const istOffsetMs = 5.5 * 60 * 60 * 1000;
            const nowIST = new Date(now.getTime() + istOffsetMs);
            const istH = nowIST.getUTCHours();
            const istM = nowIST.getUTCMinutes();
            const nowStr = (istH < 10 ? '0' : '') + istH + ':' + (istM < 10 ? '0' : '') + istM;

            const isOwner = req.user && shop.owner && shop.owner.equals(req.user._id);

            if (!isOwner) {
                if (!shop.isActive || shop.isHoliday) {
                    return res.status(400).json({ success: false, message: "This shop is currently closed and not accepting orders." });
                }
                if (shop.openingTime && shop.closingTime) {
                    if (!(nowStr >= shop.openingTime && nowStr <= shop.closingTime)) {
                        return res.status(400).json({ success: false, message: `This shop is currently closed. It will open at ${shop.openingTime}.` });
                    }
                }
            }
        }

        const existingItemIndex = cart.items.findIndex(i => i.itemId === itemId);

        // Calculate actual price after discount
        let originalPrice = item.price;
        let actualPrice = item.price;
        if (!isProduct && item.discount > 0) {
            actualPrice = Math.round(item.price * (1 - item.discount / 100));
        }

        const category = isProduct ? item.categories : item.itemCategory;
        const restrictedCategories = ['Mobile', 'Laptop', 'Tablet', 'Television', 'High Value Electronics', 'Electronics'];
        if (restrictedCategories.includes(category) && actualPrice > 5000) {
            return res.status(400).json({ success: false, message: "Delivery is not allowed for high value electronics over ₹5000. Please visit the shop to purchase this product." });
        }

        const incomingDeliveryType = item.deliveryType || 'standard';

        if (cart.items.length > 0) {
            const existingDeliveryType = cart.items[0].deliveryType;
            if (existingDeliveryType !== incomingDeliveryType) {
                return res.status(400).json({ 
                    success: false, 
                    message: `You cannot mix ${existingDeliveryType} delivery items with ${incomingDeliveryType} delivery items. Please place separate orders.` 
                });
            }
        }

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += parsedQuantity;
            // Update price to latest in case it changed or has discount
            cart.items[existingItemIndex].price = actualPrice;
            cart.items[existingItemIndex].originalPrice = originalPrice;
        } else {
            cart.items.push({
                itemId: item._id,
                name: isProduct ? item.productName : item.name,
                price: actualPrice,
                originalPrice: originalPrice,
                quantity: parsedQuantity,
                image: itemImage || (isProduct ? (item.productImage[0] ? item.productImage[0].url : '') : (item.img && item.img.url ? item.img.url : '')),
                shopId: shopId,
                shopName: finalShopName,
                shopUpiId: shopUpiId,
                shopOwnerUsername: shopOwnerUsername,
                bazaarName: bazaarName,
                shopLocation: shopLocation,
                deliveryType: incomingDeliveryType,
                canDeliverByBike: item.canDeliverByBike !== false,
                preparationTime: item.preparationTime || 0,
                maxDeliveryDistance: item.maxDeliveryDistance || 10
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
    
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        const coins = req.user && req.user.coins ? req.user.coins : 0;
        return res.json({ success: true, cart: req.session.cart, coins: coins });
    }
    
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

        let maxAllowedDistance = 5; // Updated to 5km max delivery distance
        if (cart.items.length > 0) {
            maxAllowedDistance = Math.min(5, ...cart.items.map(i => i.maxDeliveryDistance !== undefined ? i.maxDeliveryDistance : 5));
        }

        if (distanceInKm > maxAllowedDistance) {
            return res.status(400).json({
                success: false,
                message: `Unable to deliver to your location for now. Max delivery radius is ${maxAllowedDistance} km.`
            });
        }

        const canDeliverByBike = cart.items.every(i => i.canDeliverByBike !== false);
        if (!canDeliverByBike) {
            return res.status(400).json({
                success: false,
                message: "Some items in your cart cannot be delivered by bike. Pickup from Shop Only."
            });
        }

        const deliveryCharge = chargeUtil.calculateDeliveryCharge(distanceInKm);

        // Subtotal for THIS shop
        const shopSubtotal = cart.items
            .filter(i => i.shopId === shopId)
            .reduce((acc, i) => acc + (i.price * i.quantity), 0);

        let isFirstOrder = false;
        if (req.user && req.user.username) {
            const existing = await FreeDeliveryUsage.findOne({ mobile: String(req.user.username) });
            if (!existing) isFirstOrder = true;
        }

        let effectiveDeliveryCharge = deliveryCharge;
        if (isFirstOrder || shopSubtotal >= 57) {
            effectiveDeliveryCharge = 0;
        } else {
            // Minimum bill amount of 57 for non-first orders if they don't get free delivery
            if (shopSubtotal + effectiveDeliveryCharge < 57) {
                effectiveDeliveryCharge = 57 - shopSubtotal;
            }
        }

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
