const express = require("express");
const router = express.Router();
const Provider = require("../data/serviceproviders.js");
const Shedule = require("../data/clander.js");
const { isLogedin, isVerifiedCustomer, validateprovider, isOwner, isadmin, findNearbyProviders } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const multer = require("multer");
const { storage, cloudinary } = require("../cloud_con.js");
const upload = multer({ storage });

// home service
// Moved to top to ensure priority
router.get("/homeservice", isLogedin, findNearbyProviders("Home Service"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/homeService.ejs", { allProvider });
}));
// others page call
// Moved to top to ensure priority
router.get("/others", isLogedin, findNearbyProviders("Others"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/others.ejs", { allProvider });
}));

// this will redirect into farmer page
router.get("/search", isLogedin, wrapAsync(async (req, res) => {
    const { q } = req.query;
    let query = q || "";
    let filter = {};

    if (query) {
        const isNumber = /^\d+$/.test(query);
        if (isNumber) {
            // Exact match for phone number or partial match if you prefer (but phoneNO is Number type)
            // Since phoneNO is Number, we can only do exact match easily or need aggregation for partial
            // Let's do exact match for now as planned
            filter = { phoneNO: parseInt(query) };
        } else {
            const regex = new RegExp(query, 'i'); // case-insensitive regex
            filter = {
                $or: [
                    { company: regex },
                    { categories: regex },
                    { location: regex }
                ]
            };
        }
    }

    const providers = await Provider.find(filter).populate("owner");
    res.render("pages/search_results.ejs", { providers, query });
}));

// this will redirect into farmer page
router.get("/farm", isLogedin, findNearbyProviders("Farming Vehicles"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/farming.ejs", { allProvider });
}));

// this will redirect the page to the fourwheeler page
router.get("/car", isLogedin, findNearbyProviders("Four Wheelers"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/four_wheelers.ejs", { allProvider });

}));

// profile route
router.get("/provider/:id/profile", isLogedin, wrapAsync(async (req, res) => {
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
    res.render("pages/profile.ejs", { providerData, currUser: req.user, existingDays: doc?.days || [], containerClass: 'page' });
}));

// this will redirect the paget bus
router.get("/bus", isLogedin, findNearbyProviders("HMV (Bus)"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    console.log(allProvider)
    res.render("pages/bus.ejs", { allProvider });
}));

// three wheelers
router.get("/three-weelers", isLogedin, findNearbyProviders("Three Wheelers"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/three.ejs", { allProvider });

}));

// caretings
router.get("/caterings", isLogedin, findNearbyProviders("Caterings"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/caterings.ejs", { allProvider });
}));

// filming pages
router.get("/filming", isLogedin, findNearbyProviders("Filming"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/filming.ejs", { allProvider });

}));

//decoration
router.get("/decor", isLogedin, findNearbyProviders("Decoration"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/decoration.ejs", { allProvider });
}));

// dj and tent pages
router.get("/djdecor", isLogedin, findNearbyProviders("DJ and Tent"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/djtant.ejs", { allProvider });
}));

// band party 
router.get("/bandparty", isLogedin, findNearbyProviders("Band Party"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/bandparty.ejs", { allProvider });
}));

// heavy equipments
router.get("/heavy", isLogedin, findNearbyProviders("Heavy Equipments"), wrapAsync(async (req, res) => {
    const { allProvider } = res.locals;
    res.render("pages/Heavy_equipments.ejs", { allProvider });
}));


// here we will get POST request send form "/providerLogin" 
// Become a provider
router.get("/become/provider", isLogedin, isVerifiedCustomer, (req, res) => {
    res.render("pages/create.ejs")
});

router.post("/become/provider", isLogedin, isVerifiedCustomer, validateprovider, upload.array('provider[personImage]', 4), wrapAsync(async (req, res) => {
    let { company, experience, location, phoneNO } = req.body.provider;
    let categories = req.body.provider.categories;
    const personImage = req.files;

    let coordinate = await geocodingClient.forwardGeocode({
        query: req.body.provider.location,
        limit: 1
    }).send();
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
        let coordinate = await geocodingClient.forwardGeocode({
            query: req.body.provider.location,
            limit: 1
        }).send();
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

router.delete("/:id/verifyfail", isLogedin, isadmin, async (req, res) => {
    let { id } = req.params;
    let provider = await Provider.findById(id);

    if (provider && provider.personImage) {
        for (let img of provider.personImage) {
            await cloudinary.uploader.destroy(img.filename);
        }
    }

    await Provider.findByIdAndDelete(id);
    console.log("provider detail is deleted");
});

module.exports = router;
