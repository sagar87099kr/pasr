const express = require("express");
const router = express.Router();
const Provider = require("../data/serviceproviders.js");
const Shop = require("../data/shops.js");
const Product = require("../data/product.js");
const Item = require("../data/item.js");
const Shedule = require("../data/clander.js");
const Review = require("../data/review.js");
const { isLogedin, isNotBlocked, isVerifiedCustomer, validateprovider, isOwner, isadmin, findNearbyProviders } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { forwardGeocode } = require("../utils/geocoder");
const multer = require("multer");
const { storage, cloudinary } = require("../cloud_con.js");
const upload = multer({ storage });


// home service
// Moved to top to ensure priority
router.get("/homeservice", findNearbyProviders("Home Service provider"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/homeService.ejs", { allProvider });
}));
// others page call
// Moved to top to ensure priority
router.get("/others", findNearbyProviders("Others"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/others.ejs", { allProvider });
}));

// this will redirect into farmer page
// Unified Search Route
router.get("/search", wrapAsync(async (req, res) => {
    // Optionally extract JWT for mobile users
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const jwt = require("jsonwebtoken");
            const Customer = require("../data/customers.js");
            const decoded = jwt.verify(token, process.env.SECRET || "fallback_secret_for_dev");
            const user = await Customer.findById(decoded.id);
            if (user) req.user = user;
        } catch (e) {
            console.error("JWT Verification failed in /search:", e.message);
        }
    }

    const { q, loc } = req.query;
    let query = q || "";
    let providerFilter = {};
    let shopFilter = {};
    let productFilter = {};
    let itemFilter = {};

    let userLocation = req.session.location;
    if (loc && loc.trim() !== '') {
        try {
            const geoData = await forwardGeocode(loc);
            if (geoData && geoData.body && geoData.body.features && geoData.body.features.length > 0) {
                userLocation = geoData.body.features[0].geometry;
            }
        } catch(err) {
            console.error("Geocoding failed for search loc:", err);
        }
    } else if (!userLocation && req.user && req.user.geometry && req.user.geometry.coordinates && req.user.geometry.coordinates.length === 2) {
        userLocation = req.user.geometry;
    }

    const hasValidLocation = userLocation && userLocation.coordinates && userLocation.coordinates.length === 2;
    let nearbyShopIds = [];

    if (hasValidLocation) {
        const maxDist = 10000; // 10km
        const geoFilter = {
            $near: {
                $geometry: { type: "Point", coordinates: userLocation.coordinates },
                $maxDistance: maxDist
            }
        };
        providerFilter.geometry = geoFilter;
        shopFilter.geometry = geoFilter;
        productFilter.geometry = geoFilter;

        const nearbyShops = await Shop.find({ geometry: geoFilter }).select('_id');
        nearbyShopIds = nearbyShops.map(s => s._id);
        itemFilter.shop = { $in: nearbyShopIds };
    }

    if (query) {
        const isNumber = /^\d+$/.test(query);
        if (isNumber) {
            const num = parseInt(query);
            providerFilter = { phoneNO: num };
            // Shops and Products don't have phoneNO in their schema directly, 
            // but we can search by owner's WhatsApp (username)
            // For now, let's keep it simple as per original logic or expand if needed.
        } else {
            const regex = new RegExp(query, 'i');
            providerFilter = {
                $or: [
                    { company: regex },
                    { categories: regex },
                    { location: regex }
                ]
            };
            shopFilter = {
                $or: [
                    { shopName: regex },
                    { category: regex },
                    { location: regex },
                    { shopDescription: regex }
                ]
            };
            productFilter = {
                $or: [
                    { productName: regex },
                    { categories: regex },
                    { location: regex },
                    { productDescription: regex }
                ]
            };
            itemFilter.name = regex;
        }
    }

    let [providers, shops, products, items] = await Promise.all([
        Provider.find(providerFilter).populate("owner"),
        Shop.find(shopFilter).populate("owner"),
        Product.find(productFilter).populate("owner"),
        Item.find(itemFilter).populate("shop").limit(100) // limit items to 100 to avoid heavy load
    ]);

    // Apply verification filtering
    if (!req.user || !req.user.isAdmin) {
        providers = providers.filter(p => p.verified || (req.user && p.owner && p.owner._id.equals(req.user._id)));
        shops = shops.filter(s => s.verified || (req.user && s.owner && s.owner._id.equals(req.user._id)));
        products = products.filter(p => p.verified || (req.user && p.owner && p.owner._id.equals(req.user._id)));
        items = items.filter(item => item.shop && (item.shop.verified || (req.user && item.shop.owner && item.shop.owner.equals(req.user._id))));
    }

    if (req.headers.accept && req.headers.accept.includes("application/json")) {
        return res.json({ success: true, providers, shops, products, items, query });
    }
    res.render("pages/search_results.ejs", { providers, shops, products, items, query });
}));

// this will redirect into farmer page
router.get("/farm", findNearbyProviders("Farming Vehicles"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/farming.ejs", { allProvider });
}));

// this will redirect the page to the fourwheeler page
router.get("/car", findNearbyProviders("Four Wheelers"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/four_wheelers.ejs", { allProvider });

}));

// profile route
router.get("/provider/:id/profile", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const providerData = await Provider.findById(id)
        .populate([
            { path: "owner" },
            {
                path: "review",
                populate: {
                    path: "author",
                },
            }]);

    if (!providerData) {
        req.flash("danger", "Provider not found.");
        return res.redirect("/home");
    }

    const doc = await Shedule.findOne({ listingId: providerData._id }).lean();

    console.log(`[DEBUG SERVER] Profile View - Provider: ${providerData.company}, Schedule Found: ${!!doc}, Days Count: ${doc?.days?.length}`);
    if (doc?.days) {
        console.log("[DEBUG SERVER] First 3 days:", JSON.stringify(doc.days.slice(0, 3)));
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json({
            success: true,
            providerData,
            existingDays: doc?.days || []
        });
    }

    res.render("pages/profile.ejs", { providerData, currUser: req.user, existingDays: doc?.days || [], containerClass: 'page' });
}));

// this will redirect the paget bus
router.get("/bus", findNearbyProviders("HMV (Bus)"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    console.log(allProvider)
    res.render("pages/bus.ejs", { allProvider });
}));

// three wheelers
router.get("/three-weelers", findNearbyProviders("Three Wheelers"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/three.ejs", { allProvider });

}));

// caretings
router.get("/caterings", findNearbyProviders("Caterings"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/caterings.ejs", { allProvider });
}));

// filming pages
router.get("/filming", findNearbyProviders("Filming"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/filming.ejs", { allProvider });

}));

//decoration
router.get("/decor", findNearbyProviders("Decoration"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/decoration.ejs", { allProvider });
}));

// dj and tent pages
router.get("/djdecor", findNearbyProviders("DJ and Tent"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/djtant.ejs", { allProvider });
}));

// band party 
router.get("/bandparty", findNearbyProviders("Band Party"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/bandparty.ejs", { allProvider });
}));

// heavy equipments
router.get("/heavy", findNearbyProviders("Heavy Equipments"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/Heavy_equipments.ejs", { allProvider });
}));


// here we will get POST request send form "/providerLogin" 
// Become a provider
router.get("/become/provider", isLogedin, isVerifiedCustomer, (req, res) => {
    res.render("pages/create.ejs")
});

router.post("/become/provider", isLogedin, isNotBlocked, isVerifiedCustomer, validateprovider, upload.array('provider[personImage]', 4), wrapAsync(async (req, res) => {

    let { company, experience, location, phoneNO } = req.body.provider;
    let categories = req.body.provider.categories;
    const personImage = req.files;

    let coordinate = await forwardGeocode(req.body.provider.location);
    const geometry = coordinate.body.features[0].geometry;
    try {
        const newProvider = new Provider({
            categories,
            personImage,
            experience,
            company,
            location,
            geometry,
            phoneNO
        });
        newProvider.owner = req.user._id;
        await newProvider.save();
        console.log(newProvider);

        req.flash("success", `Thank you for becoming provider`);
        res.redirect("/home");
    }
    catch (e) {
        console.log(e);
        req.flash("danger", e.message);
        res.redirect("/become/provider");
    }

}));

// This will render the form of update route.
router.get("/provider/:id/edit",
    isLogedin,
    wrapAsync(async (req, res) => {
        let { id } = req.params;
        const data = await Provider.findById(id);
        res.render("pages/edit.ejs", { data });
    }));

// update route 
router.put("/update/:id",
    isLogedin,
    isOwner,
    wrapAsync(async (req, res) => {

        let { id } = req.params;
        let coordinate = await forwardGeocode(req.body.provider.location);
        const geometry = coordinate.body.features[0].geometry;
        const categories = req.body.provider.categories;
        let { discription, experience, company, location } = req.body.provider;
        await Provider.findByIdAndUpdate(id, { discription, categories, experience, company, location, geometry });
        req.flash("success",
            "Your profile is upto date");
        res.redirect(`/provider/${id}/profile`);

    }));

// these are verification route for provider listing
router.get("/provider/verify", isLogedin, isadmin, async (req, res) => {
    let providers = await Provider.find().populate("owner");
    res.render("pages/providerverify.ejs", { providers });
});

router.put("/:id/verifyprovider", isLogedin, isadmin, async (req, res) => {

    let { id } = req.params;
    const { verified, verifedBy } = req.body.provider;
    console.log(verified)
    await Provider.findByIdAndUpdate(id, { verified, verifedBy });
    console.log("provider is verifed");
});

router.delete("/provider/:id/verifyfail", isLogedin, isadmin, wrapAsync(async (req, res) => {

    try {
        let { id } = req.params;
        let provider = await Provider.findById(id);

        if (provider) {
            // Delete images from Cloudinary if they exist
            if (provider.personImage && provider.personImage.length > 0) {
                for (let img of provider.personImage) {
                    try {
                        if (img.filename) {
                            await cloudinary.uploader.destroy(img.filename);
                        }
                    } catch (e) {
                        console.error("Cloudinary delete error:", e);
                    }
                }
            }

            // Delete associated reviews
            if (provider.review && provider.review.length > 0) {
                await Review.deleteMany({ _id: { $in: provider.review } });
            }


            await Provider.findByIdAndDelete(id);
            console.log("provider detail is deleted");
            req.flash("success", "Provider deleted successfully");
        } else {
            req.flash("error", "Provider not found");
        }
    } catch (e) {
        console.error("Provider delete error:", e);
        req.flash("error", "Create error deleting provider");
    }
    res.redirect("/provider/verify");
}));

// Add image to provider gallery
router.post("/provider/:id/add-image", isLogedin, isOwner, upload.single('image'), wrapAsync(async (req, res) => {

    try {
        const { id } = req.params;
        const { description } = req.body;
        const provider = await Provider.findById(id);

        if (!provider) {
            req.flash("danger", "Provider not found.");
            return res.redirect("/home");
        }

        // Add image with description to Image array
        const imageData = {
            url: req.file.path,
            filename: req.file.filename,
            description: description || ""
        };

        provider.Image.push(imageData);
        await provider.save();

        req.flash("success", "Image added successfully!");
        res.redirect(`/provider/${id}/profile`);
    } catch (e) {
        console.error("Image upload error:", e);
        req.flash("danger", "Failed to upload image.");
        res.redirect(`/provider/${req.params.id}/profile`);
    }
}));

// Delete image from provider gallery
router.delete("/provider/:id/delete-image/:imageIndex", isLogedin, isOwner, wrapAsync(async (req, res) => {

    try {
        const { id, imageIndex } = req.params;
        const provider = await Provider.findById(id);

        if (!provider) {
            req.flash("danger", "Provider not found.");
            return res.redirect("/home");
        }

        const index = parseInt(imageIndex);
        if (index >= 0 && index < provider.Image.length) {
            const image = provider.Image[index];

            // Delete from Cloudinary if filename exists
            if (image.filename) {
                await cloudinary.uploader.destroy(image.filename);
                // Remove from array using $pull (more robust than splice for DB arrays)
                await Provider.findByIdAndUpdate(id, { $pull: { Image: { filename: image.filename } } });
            } else {
                // If no filename (legacy data?), fell back to splice or pull by url? 
                // For now, let's just use splice as fallback if no filename, 
                // but getting image by index implies we have it.
                // Actually, let's just safely pull by the exact object or verify.
                // Since we have the image object, if filename is missing, we can try matching other fields or just splice.
                // Given the constraint, let's stick to the user's request context: 
                // "delete picture description... and image from cloudnary"

                // If no filename, we can't delete from cloudinary, but we should still remove from DB.
                provider.Image.splice(index, 1);
                await provider.save();
            }

            req.flash("success", "Image deleted successfully!");
        } else {
            req.flash("danger", "Image not found.");
        }

        res.redirect(`/provider/${id}/profile`);
    } catch (e) {
        console.error("Image delete error:", e);
        req.flash("danger", "Failed to delete image.");
        res.redirect(`/provider/${req.params.id}/profile`);
    }
}));

// Search Suggestions API
router.get("/api/search/suggestions", wrapAsync(async (req, res) => {
    const { q, loc } = req.query;
    if (!q || q.length < 2) return res.json({ providers: [], shops: [], products: [], items: [] });
    
    let query = q;
    let providerFilter = {};
    let shopFilter = {};
    let productFilter = {};
    let itemFilter = {};

    let userLocation = req.session.location;
    if (loc && loc.trim() !== '') {
        try {
            const geoData = await forwardGeocode(loc);
            if (geoData && geoData.body && geoData.body.features && geoData.body.features.length > 0) {
                userLocation = geoData.body.features[0].geometry;
            }
        } catch(err) {
            console.error("Geocoding failed for search loc:", err);
        }
    } else if (!userLocation && req.user && req.user.geometry && req.user.geometry.coordinates && req.user.geometry.coordinates.length === 2) {
        userLocation = req.user.geometry;
    }

    const hasValidLocation = userLocation && userLocation.coordinates && userLocation.coordinates.length === 2;
    let nearbyShopIds = [];

    if (hasValidLocation) {
        const maxDist = 10000; // 10km
        const geoFilter = {
            $near: {
                $geometry: { type: "Point", coordinates: userLocation.coordinates },
                $maxDistance: maxDist
            }
        };
        providerFilter.geometry = geoFilter;
        shopFilter.geometry = geoFilter;
        productFilter.geometry = geoFilter;

        const nearbyShops = await Shop.find({ geometry: geoFilter }).select('_id');
        nearbyShopIds = nearbyShops.map(s => s._id);
        itemFilter.shop = { $in: nearbyShopIds };
    }

    const regex = new RegExp(query, 'i');
    
    const isNumber = /^\d+$/.test(query);
    if (isNumber) {
        const num = parseInt(query);
        providerFilter = { phoneNO: num };
    } else {
        providerFilter = { $or: [{ company: regex }, { categories: regex }, { location: regex }] };
        shopFilter = { $or: [{ shopName: regex }, { category: regex }, { location: regex }, { shopDescription: regex }] };
        productFilter = { $or: [{ productName: regex }, { categories: regex }, { location: regex }, { productDescription: regex }] };
        itemFilter.name = regex;
    }

    let [providers, shops, products, items] = await Promise.all([
        Provider.find({ ...providerFilter, verified: true }).limit(3).select('company categories location'),
        Shop.find({ ...shopFilter, verified: true }).limit(3).select('shopName category location'),
        Product.find({ ...productFilter, verified: true }).limit(3).select('productName price location categories'),
        Item.find(itemFilter).populate({ path: "shop", match: { verified: true }, select: "shopName location" }).limit(5).select('name price img shop')
    ]);

    // Filter out items whose populated shop didn't match verification
    items = items.filter(item => item.shop != null);
    // Cut down items to 3 after filtering
    items = items.slice(0, 3);

    res.json({ providers, shops, products, items });
}));

module.exports = router;
