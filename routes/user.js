const express = require("express");
const router = express.Router();
const Customer = require("../data/customers.js");
const Provider = require("../data/serviceproviders.js");
const Product = require("../data/product.js");
const passport = require("passport");
const { validatecustomer, saveRedirectUrl, isLogedin, isadmin } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

// login route for all 
router.get("/signup", (req, res) => {
    res.render("pages/signup.ejs");
});

// login route for customer.
router.get("/customer/signup", (req, res) => {
    res.render("pages/customer.ejs");
});

// we will take the post request here and save it in our data bases
router.post("/customer/signup", validatecustomer, wrapAsync(async (req, res, next) => {
    let coordinate = await geocodingClient.forwardGeocode({
        query: req.body.customer.address,
        limit: 1
    }).send();
    try {
        const { name, username, password, address, pincode, emailAddress } = req.body.customer;
        const geometry = coordinate.body.features[0].geometry;
        const newCustomer = new Customer({
            name,
            username,
            emailAddress,
            address,
            geometry,
            pincode,
        });

        // Register user (this saves to DB)
        const registeredUser = await Customer.register(newCustomer, password);

        // LOGIN AFTER SIGNUP
        req.login(registeredUser, (err) => {
            if (err) return next(err);

            req.flash(
                "success",
                `Welcome to PaSr. Thank you for signup ${name}`
            );
            res.redirect("/home");
        });

    } catch (e) {
        console.log(e);

        if (e.message.includes("User already exists")) {
            req.flash("danger", "Username already registered");
        } else {
            req.flash("danger", e.message);
        }

        res.redirect("/customer/signup");
    }
}));


// If a person has already logedin before and trying to re login for that is this the route
router.get("/alreadyLogin", (req, res) => {
    res.render("pages/relogin.ejs")
});

router.post(
    "/alreadyLogin",
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/alreadyLogin",
        failureFlash: "MobileNO or password is not correct",
    }),
    async (req, res) => {
        req.flash("success", "Welcome back to PaSr. Your login is successfull");
        let redirectUrl = res.locals.redirectUrl || "/home";
        res.redirect(redirectUrl);
    }
);

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("danger", "You are loged out! now");
        res.redirect("/home");
    })
});

// here i am going to create a new page where people will able to see their profile. 
router.get("/user", isLogedin, saveRedirectUrl, wrapAsync(async (req, res) => {
    const listings = await Provider.find({ owner: req.user._id });
    const products = await Product.find({ owner: req.user._id });
    res.render("pages/provider_profile.ejs", { listings, products });
}));

// these are verification route for customers 
router.get("/customer/verify", isLogedin, isadmin, async (req, res) => {
    let customers = await Customer.find();
    res.render("pages/userverification.ejs", { customers });
});

// set value true
router.put("/:id/verifycustomer", isLogedin, isadmin, async (req, res) => {
    let { id } = req.params;
    const { verified, verifedBy } = req.body.customer;
    console.log(verified)
    await Customer.findByIdAndUpdate(id, { verified, verifedBy });
    console.log("customer is verifed");
});

// we anything suspicious delete customer from database
router.delete("/:id/verifyfail", isLogedin, isadmin, async (req, res) => {
    let { id } = req.params;
    await Customer.findByIdAndDelete(id);
    console.log("customer is deleted");
});


// Update Customer Profile Route
router.put("/customer/update/:id", isLogedin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { address, pincode } = req.body.customer;

    // Geocode the new address to get coordinates
    let geometry;
    try {
        const coordinate = await geocodingClient.forwardGeocode({
            query: address,
            limit: 1
        }).send();
        geometry = coordinate.body.features[0].geometry;
    } catch (e) {
        console.error("Geocoding failed", e);
        req.flash("danger", "Could not verify address location.");
        return res.redirect("/user");
    }

    await Customer.findByIdAndUpdate(id, {
        address,
        pincode,
        geometry
    });

    req.flash("success", "Profile location updated successfully");
    res.redirect("/user");
}));

module.exports = router;
