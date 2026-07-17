const Provider = require("./data/serviceproviders.js");
const { providerSchema, customerSchema, reviewSchema, shopSchema, itemSchema, deliveryPartnerSchema, productSchema } = require("./schema.js");
const DeliveryPartner = require("./data/deliveryPartner.js");
const ExpressError = require("./utils/expressError.js");
const Review = require("./data/review.js");
const Customer = require("./data/customers.js");



const jwt = require("jsonwebtoken");

module.exports.isLogedin = async (req, res, next) => {
    // 1. Check for JWT (Mobile API Auth)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.SECRET || "fallback_secret_for_dev");
            const user = await Customer.findById(decoded.id);
            if (user) {
                req.user = user;
                req.isAuthenticated = () => true; // Override for subsequent middlewares
                return next();
            }
        } catch (e) {
            console.error("JWT Verification failed:", e.message);
        }
    }

    // 2. Default Session Auth (Web App)
    if (!req.isAuthenticated()) {

        req.session.redirectUrl = req.originalUrl;
        
        // Return 401 JSON for AJAX/fetch requests (usually non-GET APIs or explicit JSON accept)
        // We skip this for GET requests since /api/cart is rendered as an HTML page.
        const isApiRequest = req.originalUrl.startsWith("/api/") && req.method !== 'GET';
        if (isApiRequest || req.xhr || req.headers.accept?.includes('application/json') || req.headers.accept?.includes('*/*') && req.method !== 'GET') {
            return res.status(401).json({ success: false, message: "Please login to continue", redirect: "?showLogin=true" });
        }
        
        req.flash("danger", "please login or create an account to see all services");
        let ref = req.get('Referrer') || '/home';
        if (ref.includes('/alreadyLogin') || ref.includes('/login') || ref.includes('/cart') || ref.includes('/checkout')) {
            ref = '/home';
        }
        const separator = ref.includes('?') ? '&' : '?';
        return res.redirect(ref + separator + "showLogin=true");
    }
    next();
}

module.exports.isLoggedOut = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash("success", "You are already logged in");
        return res.redirect("/home");
    }
    next();
}

module.exports.isNotBlocked = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) return next();

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
            console.warn(`[Middleware] Invalid user ID for isNotBlocked: ${req.user._id}`);
            return next();
        }

        const customer = await Customer.findById(req.user._id);
        if (customer && customer.isBlocked) {
            req.flash("danger", "You are blocked because of your suspicious activity.");
            const redirectUrl = req.get('Referrer') || '/home';
            return res.redirect(redirectUrl);
        }
        next();
    } catch (e) {
        next(e);
    }
}

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner = async (req, res, next) => {
    try {
        let { id } = req.params;
        const mongoose = require('mongoose');
        if (!mongoose.isValidObjectId(id)) {
            req.flash("danger", "Invalid Provider ID");
            return res.redirect("/home");
        }
        let provider = await Provider.findById(id);
        if (!provider) {
            req.flash("danger", "Provider not found");
            return res.redirect("/home");
        }
        // Fix: provider.owner is an ObjectId (not populated), so we compare directly
        if (res.locals.currUser && !provider.owner.equals(res.locals.currUser._id)) {
            req.flash("danger", "You are not the Owner.");
            return res.redirect(`/provider/${id}/profile`);
        }
        next();
    } catch (e) {
        next(e);
    }
}

module.exports.isProductOwner = async (req, res, next) => {
    try {
        let { id } = req.params;
        const mongoose = require('mongoose');
        const Product = require("./data/product.js");

        if (!mongoose.isValidObjectId(id)) {
            req.flash("danger", "Invalid Product ID");
            return res.redirect("/localMarket");
        }

        let product = await Product.findById(id);
        if (!product) {
            req.flash("danger", "Product not found");
            return res.redirect("/localMarket");
        }

        console.log("Checking ownership. Product Owner:", product.owner, "Current User:", res.locals.currUser._id);
        if (res.locals.currUser && !product.owner.equals(res.locals.currUser._id)) {
            console.log("Ownership mismatch");
            req.flash("danger", "You are not the owner of this product.");
            return res.redirect(`/products/${id}`);
        }

        next();
    } catch (e) {
        next(e);
    }
}

module.exports.isVerifiedCustomer = async (req, res, next) => {
    try {
        // IMPORTANT: choose the correct id source:
        // - If your route is like /customer/:id/... use req.params.id
        // - If you're checking logged-in customer, use req.user._id (recommended)

        const customerId = req.user?._id; // recommended for logged-in user
        // const customerId = req.params.id; // if you really want param-based

        if (!customerId) {
            req.flash("danger", "Please login first.");
            return res.redirect("/login");
        }

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            console.error(`[Middleware] Invalid customer ID for verification: ${customerId}`);
            req.flash("danger", "Invalid account state. Please contact support.");
            return res.redirect("/home");
        }

        const customer = await Customer.findById(customerId);

        if (!customer) {
            req.flash("danger", "Customer not found.");
            return res.redirect("/home");
        }

        if (customer.verified !== true) {
            req.flash("danger", "You are not verified yet.");
            return res.redirect("/home");
        }

        // optional: keep it available for next handlers
        res.locals.currentCustomer = customer;

        next();
    } catch (err) {
        next(err);
    }
};
module.exports.isadmin = async (req, res, next) => {
    if (!res.locals.isAdmin) {
        req.flash("danger", "Only admin have access of this route");
        return res.redirect(`/home`);
    }
    next();
}
module.exports.validateprovider = (req, res, next) => {
    let { error } = providerSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg)
    } else {
        next()
    }

}
module.exports.validatecustomer = (req, res, next) => {
    let { error } = customerSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg)
    } else {
        next();
    }

}
module.exports.validatereview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg)
    } else {
        next();
    }
}

module.exports.validateShop = (req, res, next) => {
    let { error } = shopSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg)
    } else {
        next();
    }
}

module.exports.validateItem = (req, res, next) => {
    let { error } = itemSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg)
    } else {
        next();
    }
}

module.exports.validateDeliveryPartner = (req, res, next) => {
    let { error } = deliveryPartnerSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg)
    } else {
        next();
    }
}

module.exports.validateProduct = (req, res, next) => {
    let { error } = productSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        req.flash('error', errMsg);
        return res.redirect('/product/seller');
    }
    next();
}

module.exports.isReviewAuthor = async (req, res, next) => {
    try {
        let { id, reviewId } = req.params;
        let review = await Review.findById(reviewId);
        if (!review) {
            req.flash("danger", "Review not found");
            return res.redirect(`/provider/${id}/profile`);
        }
        if (res.locals.currUser && !review.author.equals(res.locals.currUser._id)) {
            req.flash("danger", "Only review owner can delete this review.");
            return res.redirect(`/provider/${id}/profile`);
        }
        next();
    } catch (e) {
        next(e);
    }
}

module.exports.findNearbyProviders = (category) => {
    return async (req, res, next) => {
        try {
            // Priority 1: Bazaar Location (from Mobile App headers)
            // Priority 2: Bazaar Location (from Web App session)
            // Priority 3: Session Location (from browser)
            // Priority 4: User Profile Location (if logged in and valid)
            let userLocation = null;

            if (req.headers['x-bazaar-lat'] && req.headers['x-bazaar-lng']) {
                userLocation = {
                    type: "Point",
                    coordinates: [parseFloat(req.headers['x-bazaar-lng']), parseFloat(req.headers['x-bazaar-lat'])]
                };
            } else if (req.session.bazaarLocation) {
                userLocation = req.session.bazaarLocation;
            } else if (req.session.location) {
                userLocation = req.session.location;
            } else if (req.user && req.user.geometry && req.user.geometry.coordinates && req.user.geometry.coordinates.length === 2) {
                userLocation = req.user.geometry;
            }

            // Validate that we have proper coordinates [lon, lat]
            const hasValidLocation = userLocation && userLocation.coordinates && userLocation.coordinates.length === 2;

            let bazaarId = null;
            if (req.headers['x-bazaar-id']) {
                bazaarId = req.headers['x-bazaar-id'];
            } else if (req.session.bazaarId) {
                bazaarId = req.session.bazaarId;
            }

            let allProvider = [];

            if (bazaarId) {
                console.log(`[DEBUG] findNearbyProviders: Searching for category: '${category}', bazaarId: '${bazaarId}'`);
                // If a bazaar is selected, fetch providers assigned to this bazaar
                allProvider = await Provider.find({
                    categories: category,
                    verified: true,
                    bazaar: bazaarId
                }).populate("owner");
                console.log(`[DEBUG] findNearbyProviders: Found ${allProvider.length} providers for bazaar ${bazaarId}`);
            } else if (hasValidLocation) {
                // Fallback to geometry search if no specific bazaar is selected
                const rangeInKm = req.query.range ? parseFloat(req.query.range) : 10;
                const maxDist = rangeInKm * 1000;

                allProvider = await Provider.find({
                    categories: category,
                    verified: true,
                    geometry: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: userLocation.coordinates
                            },
                            $maxDistance: maxDist
                        }
                    }
                }).populate("owner");
            } else {
                // If no user location and no bazaar, fallback to finding all verified in category
                console.log("No valid user geometry found, returning all providers");
                allProvider = await Provider.find({ categories: category, verified: true }).populate("owner");
            }

            req.nearbyProviders = allProvider;
            res.locals.allProvider = allProvider;
            next();
        } catch (e) {
            console.error("Error in findNearbyProviders:", e);
            req.flash("danger", "Could not fetch nearby providers");
            res.redirect("/home");
        }
    }
}
module.exports.isDeliveryPartner = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("danger", "You must be logged in.");
        return res.redirect("/alreadyLogin");
    }
    const partner = await DeliveryPartner.findOne({ user: req.user._id });
    if (!partner) {
        req.flash("danger", "You are not registered as a Delivery Partner.");
        return res.redirect("/home");
    }
    req.deliveryPartner = partner; // Attach profile for easy access
    next();
};
