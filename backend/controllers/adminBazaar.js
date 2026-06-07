const Bazaar = require("../data/bazaar");
const Shop = require("../data/shops");

module.exports.getBazaars = async (req, res, next) => {
    try {
        const bazaars = await Bazaar.find({}).sort({ name: 1 });
        res.render("pages/adminBazaars", { bazaars, containerClass: 'container-fluid w-100 p-3 p-md-5 m-0' });
    } catch (e) {
        next(e);
    }
};

module.exports.createBazaar = async (req, res, next) => {
    try {
        const { name, location, lat, lng } = req.body;
        const newBazaar = new Bazaar({
            name,
            location,
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(lng) || 86.000, parseFloat(lat) || 24.000] // Default coords if empty
            },
            isActive: true
        });
        await newBazaar.save();
        req.flash("success", "Bazaar created successfully.");
        res.redirect("/admin/bazaars");
    } catch (e) {
        req.flash("error", "Error creating bazaar.");
        res.redirect("/admin/bazaars");
    }
};



module.exports.assignBazaarToShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { bazaarId } = req.body;
        
        if (!bazaarId) {
            await Shop.findByIdAndUpdate(id, { $unset: { bazaar: 1 } });
        } else {
            await Shop.findByIdAndUpdate(id, { bazaar: bazaarId });
        }

        // If it's an AJAX request expecting JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true, message: "Bazaar assigned successfully." });
        }
        
        req.flash("success", "Bazaar assignment updated.");
        res.redirect("/shops/verify");
    } catch (e) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, message: e.message });
        }
        req.flash("error", "Failed to update bazaar assignment.");
        res.redirect("/shops/verify");
    }
};
