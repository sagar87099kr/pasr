const express = require("express");
const router = express.Router();
const Customer = require("../data/customers.js");
const Provider = require("../data/serviceproviders.js");
const Product = require("../data/product.js");
const Shop = require("../data/shops.js");
const KeshanSabhaPost = require("../data/keshanSabhaPost.js");
const passport = require("passport");
const { validatecustomer, saveRedirectUrl, isLogedin, isadmin } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { forwardGeocode } = require("../utils/geocoder");


// login route for all 
// login route for all 
router.get("/signup", (req, res) => {
    res.redirect("/customer/signup");
});

// login route for customer.
router.get("/customer/signup", (req, res) => {
    res.render("pages/customer.ejs");
});

// STEP 1: Collect signup form data, generate OTP, store in session, redirect to verify page
router.post("/customer/signup", validatecustomer, wrapAsync(async (req, res, next) => {

    try {
        const { name, username, password, address } = req.body.customer;

        // Check if this number is already registered
        const existing = await Customer.findOne({ username: Number(username) });
        if (existing) {
            req.flash("danger", "This WhatsApp number is already registered. Please log in.");
            return res.redirect("/customer/signup");
        }

        // Geocode the address to get coordinates
        const geoData = await forwardGeocode(address);
        let pincode = null;
        if (geoData.body.features.length > 0) {
            const context = geoData.body.features[0].context;
            if (context) {
                const pinCtx = context.find(c => c.id.startsWith('postcode') || c.id === 'postal_code');
                if (pinCtx) pincode = parseInt(pinCtx.text);
            }
        }
        const geometry = geoData.body.features[0].geometry;

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Save pending data in session (no DB write yet)
        req.session.pendingSignup = { name, username, password, address, pincode, geometry, otp, otpExpiry };
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

        res.redirect("/customer/verify-otp");

    } catch (e) {
        console.log(e);
        req.flash("danger", e.message || "Something went wrong. Please try again.");
        res.redirect("/customer/signup");
    }
}));

// STEP 2a: Show OTP verification page
router.get("/customer/verify-otp", (req, res) => {
    if (!req.session.pendingSignup) {
        req.flash("danger", "Session expired. Please fill the signup form again.");
        return res.redirect("/customer/signup");
    }
    res.render("pages/otpVerify.ejs", { phone: req.session.pendingSignup.username, otp: req.session.pendingSignup.otp });
});

// STEP 2b: Verify OTP and complete registration
router.post("/customer/verify-otp", wrapAsync(async (req, res, next) => {

    const pending = req.session.pendingSignup;

    if (!pending) {
        req.flash("danger", "Session expired. Please fill the signup form again.");
        return res.redirect("/customer/signup");
    }

    if (Date.now() > pending.otpExpiry) {
        req.session.pendingSignup = null;
        req.flash("danger", "OTP expired. Please sign up again.");
        return res.redirect("/customer/signup");
    }

    const enteredOtp = (req.body.otp || "").trim();
    if (enteredOtp !== pending.otp) {
        req.flash("danger", "Incorrect OTP. Please try again.");
        return res.redirect("/customer/verify-otp");
    }

    try {
        // OTP correct — now create the account
        const newCustomer = new Customer({
            name: pending.name,
            username: pending.username,
            address: pending.address,
            pincode: pending.pincode,
            geometry: pending.geometry
        });

        const registeredUser = await Customer.register(newCustomer, pending.password);
        req.session.pendingSignup = null; // clear pending data

        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "WhatsApp number verified! Welcome to PaSr 🎉");
            req.session.save(() => res.redirect("/home"));
        });

    } catch (e) {
        console.log(e);
        req.flash("danger", e.message || "Registration failed. Please try again.");
        res.redirect("/customer/signup");
    }
}));



// If a person has already logedin before and trying to re login for that is this the route
router.get("/alreadyLogin", (req, res) => {
    const failedAttempts = req.session.failedLoginAttempts || 0;
    res.render("pages/relogin.ejs", { failedAttempts });
});

router.post("/alreadyLogin", saveRedirectUrl, (req, res, next) => {

    passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);

        if (!user) {
            // Login failed, increment counter
            req.session.failedLoginAttempts = (req.session.failedLoginAttempts || 0) + 1;
            req.flash("danger", "Mobile NO or password is not correct");
            return res.redirect("/alreadyLogin");
        }

        // Login succeeded, log the user in
        req.logIn(user, (err) => {
            if (err) return next(err);

            // Clear the failed attempts counter on success
            req.session.failedLoginAttempts = 0;
            req.flash("success", "Welcome back to PaSr. Your login is successful");

            let redirectUrl = res.locals.redirectUrl || "/home";
            res.redirect(redirectUrl);
        });
    })(req, res, next);
});

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("danger", "You are loged out! now");
        res.redirect("/home");
    })
});

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
const crypto = require("crypto");

// GET: Show "enter your WhatsApp number" form
router.get("/forgot-password", (req, res) => {
    res.render("pages/forgotPassword.ejs");
});

// POST: Look up user, generate token, show WhatsApp send screen
router.post("/forgot-password", wrapAsync(async (req, res) => {

    const { username } = req.body;
    const user = await Customer.findOne({ username: Number(username) });

    if (!user) {
        req.flash("danger", "No account found with that WhatsApp number.");
        return res.redirect("/forgot-password");
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    // Build the reset URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    // Build WhatsApp "message yourself" URL (works on WhatsApp Web & mobile)
    const message = `Hi! Here is your PaSr password reset link:\n\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, ignore this message.`;
    const phone = `91${username}`; // Add India country code
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    res.render("pages/whatsappSent.ejs", { whatsappUrl, phone: username });
}));

// GET: Show reset password form (validate token)
router.get("/reset-password/:token", wrapAsync(async (req, res) => {
    const { token } = req.params;
    const user = await Customer.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() } // token must not be expired
    });

    if (!user) {
        req.flash("danger", "Reset link is invalid or has expired. Please request a new one.");
        return res.redirect("/forgot-password");
    }

    res.render("pages/resetPassword.ejs", { token });
}));

// POST: Set the new password
router.post("/reset-password/:token", wrapAsync(async (req, res) => {

    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        req.flash("danger", "Passwords do not match.");
        return res.redirect(`/reset-password/${token}`);
    }

    if (password.length < 6) {
        req.flash("danger", "Password must be at least 6 characters.");
        return res.redirect(`/reset-password/${token}`);
    }

    const user = await Customer.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
        req.flash("danger", "Reset link is invalid or has expired. Please request a new one.");
        return res.redirect("/forgot-password");
    }

    // Update password using passport-local-mongoose's setPassword
    await user.setPassword(password);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    req.flash("success", "Password updated successfully! Please log in with your new password.");
    res.redirect("/alreadyLogin");
}));
// ─────────────────────────────────────────────────────────────────────────────


// here i am going to create a new page where people will able to see their profile. 
router.get("/user", isLogedin, saveRedirectUrl, wrapAsync(async (req, res) => {
    const DeliveryPartner = require("../data/deliveryPartner");
    const listings = await Provider.find({ owner: req.user._id });
    const products = await Product.find({ owner: req.user._id });
    const shops = await Shop.find({ owner: req.user._id });
    const kisanPosts = await KeshanSabhaPost.find({ author: req.user._id }).sort({ createdAt: -1 });
    const deliveryPartner = await DeliveryPartner.findOne({ user: req.user._id });
    res.render("pages/provider_profile.ejs", { listings, products, shops, kisanPosts, deliveryPartner });
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
router.delete("/customer/:id/verifyfail", isLogedin, isadmin, async (req, res) => {

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
        const coordinate = await forwardGeocode(address);
        if (!coordinate.body.features.length) {
            throw new Error("No location found for this address");
        }
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

// Delete Account - Direct deletion with admin notification logging
router.post("/customer/delete-account", isLogedin, wrapAsync(async (req, res) => {

    const { username, password } = req.body;
    const userId = req.user._id;

    try {
        // Verify phone number matches
        if (req.user.username != username) {
            req.flash("danger", "Phone number does not match your account.");
            return res.redirect("/customer/delete-account");
        }

        // Verify password
        const user = await Customer.findById(userId);
        await user.authenticate(password, (err, result) => {
            if (err || !result) {
                req.flash("danger", "Incorrect password.");
                return res.redirect("/customer/delete-account");
            }
        });

        console.log(`\n${'='.repeat(60)}`);
        console.log(`⚠️  ACCOUNT DELETION REQUEST`);
        console.log(`${'='.repeat(60)}`);
        console.log(`User ID: ${userId}`);
        console.log(`Name: ${req.user.name}`);
        console.log(`Phone: ${req.user.username}`);
        console.log(`Email: ${req.user.emailAddress || 'N/A'}`);
        console.log(`Address: ${req.user.address || 'N/A'}`);
        console.log(`Verified: ${req.user.verified}`);
        console.log(`Account Created: ${req.user.createdAt}`);
        console.log(`Deletion Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`${'='.repeat(60)}\n`);

        // Import cloudinary for image deletion
        const cloudinary = require("../cloud_con.js");
        const Review = require("../data/review.js");

        // 1. Delete all service provider listings and their images
        const providers = await Provider.find({ owner: userId });
        for (let provider of providers) {
            // Delete provider images from Cloudinary
            if (provider.personImage && provider.personImage.length > 0) {
                for (let img of provider.personImage) {
                    if (img.filename) {
                        try {
                            await cloudinary.uploader.destroy(img.filename);
                            console.log(`Deleted provider image: ${img.filename}`);
                        } catch (err) {
                            console.error(`Error deleting image ${img.filename}:`, err);
                        }
                    }
                }
            }
            // Delete provider reviews
            if (provider.review && provider.review.length > 0) {
                await Review.deleteMany({ _id: { $in: provider.review } });
            }
            await Provider.findByIdAndDelete(provider._id);
            console.log(`Deleted provider: ${provider._id}`);
        }

        // 2. Delete all shops and their images
        const shops = await Shop.find({ owner: userId });
        for (let shop of shops) {
            // Delete shop images from Cloudinary
            if (shop.shopImage && shop.shopImage.length > 0) {
                for (let img of shop.shopImage) {
                    if (img.filename) {
                        try {
                            await cloudinary.uploader.destroy(img.filename);
                            console.log(`Deleted shop image: ${img.filename}`);
                        } catch (err) {
                            console.error(`Error deleting image ${img.filename}:`, err);
                        }
                    }
                }
            }
            // Delete shop item images
            if (shop.items && shop.items.length > 0) {
                for (let item of shop.items) {
                    if (item.itemImage && item.itemImage.filename) {
                        try {
                            await cloudinary.uploader.destroy(item.itemImage.filename);
                            console.log(`Deleted item image: ${item.itemImage.filename}`);
                        } catch (err) {
                            console.error(`Error deleting image ${item.itemImage.filename}:`, err);
                        }
                    }
                }
            }
            // Delete shop reviews
            if (shop.reviews && shop.reviews.length > 0) {
                await Review.deleteMany({ _id: { $in: shop.reviews } });
            }
            await Shop.findByIdAndDelete(shop._id);
            console.log(`Deleted shop: ${shop._id}`);
        }

        // 3. Delete all products and their images
        const products = await Product.find({ owner: userId });
        for (let product of products) {
            // Delete product images from Cloudinary
            if (product.productImage && product.productImage.length > 0) {
                for (let img of product.productImage) {
                    if (img.filename) {
                        try {
                            await cloudinary.uploader.destroy(img.filename);
                            console.log(`Deleted product image: ${img.filename}`);
                        } catch (err) {
                            console.error(`Error deleting image ${img.filename}:`, err);
                        }
                    }
                }
            }
            await Product.findByIdAndDelete(product._id);
            console.log(`Deleted product: ${product._id}`);
        }

        // 4. Delete all reviews authored by this user
        const userReviews = await Review.find({ author: userId });
        await Review.deleteMany({ author: userId });
        console.log(`Deleted ${userReviews.length} reviews by user`);

        // 5. Finally, delete the user account
        await Customer.findByIdAndDelete(userId);
        console.log(`Deleted user account: ${userId}`);
        console.log(`${'='.repeat(60)}\n`);

        // Prepare WhatsApp notification message
        const userName = req.user.name;
        const userPhone = req.user.username;
        const deletionTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        const whatsappMessage = `🚨 Account Deleted from PaSr%0A%0AName: ${encodeURIComponent(userName)}%0APhone: ${userPhone}%0ATime: ${encodeURIComponent(deletionTime)}`;
        const whatsappUrl = `https://wa.me/918252271535?text=${whatsappMessage}`;

        // Logout and redirect to WhatsApp
        req.logout((err) => {
            if (err) {
                console.error("Error logging out:", err);
            }
            req.flash("success", "Your account has been permanently deleted. We're sorry to see you go.");
            // Redirect to a page that will auto-open WhatsApp
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Account Deleted</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            background: #f3f4f6;
                            margin: 0;
                        }
                        .container {
                            text-align: center;
                            padding: 40px;
                            background: white;
                            border-radius: 12px;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        }
                        h1 { color: #dc2626; }
                        p { color: #6b7280; margin: 20px 0; }
                        a { 
                            display: inline-block;
                            background: #25D366;
                            color: white;
                            padding: 12px 24px;
                            border-radius: 8px;
                            text-decoration: none;
                            margin-top: 20px;
                        }
                        a:hover { background: #20BA5A; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✓ Account Deleted Successfully</h1>
                        <p>Your account and all associated data have been permanently removed.</p>
                        <p>Redirecting to home page in 5 seconds...</p>
                        <a href="/home">Go to Home Now</a>
                    </div>
                    <script>
                        // Try to open WhatsApp notification for admin
                        setTimeout(() => {
                            window.open('${whatsappUrl}', '_blank');
                        }, 500);
                        
                        // Redirect to home after 5 seconds
                        setTimeout(() => {
                            window.location.href = '/home';
                        }, 5000);
                    </script>
                </body>
                </html>
            `);
        });

    } catch (error) {
        console.error("Error deleting account:", error);
        req.flash("danger", "An error occurred while deleting your account. Please try again or contact support.");
        res.redirect("/customer/delete-account");
    }
}));

module.exports = router;
