const express = require("express");
const router = express.Router();
const Customer = require("../data/customers.js");
const Provider = require("../data/serviceproviders.js");
const Product = require("../data/product.js");
const Shop = require("../data/shops.js");
const KeshanSabhaPost = require("../data/keshanSabhaPost.js");
const KeshanSabhaComment = require("../data/keshanSabhaComment.js");
const KeshanSabhaReport = require("../data/keshanSabhaReport.js");
const DeliveryPartner = require("../data/deliveryPartner.js");
const Notification = require("../data/notification.js");
const Review = require("../data/review.js");
const passport = require("passport");
const { validatecustomer, saveRedirectUrl, isLogedin, isadmin, isLoggedOut } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");
const userController = require("../controllers/user.js");
const { forwardGeocode } = require("../utils/geocoder");

// Helper to generate a unique referral code
async function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    while (true) {
        code = 'PASR';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existing = await Customer.findOne({ referralCode: code });
        if (!existing) break;
    }
    return code;
}


// login route for all // login route for all 
router.get("/login", isLoggedOut, (req, res) => {
    res.redirect("/alreadyLogin");
});

// login route for all 
router.get("/signup", isLoggedOut, (req, res) => {
    res.redirect("/customer/signup");
});

// login route for customer.
router.get("/customer/signup", isLoggedOut, (req, res) => {
    res.render("pages/customer.ejs");
});

// STEP 1: Collect signup form data, generate OTP, store in session, redirect to verify page
router.post("/customer/signup", validatecustomer, wrapAsync(async (req, res, next) => {

    try {
        const { name, username, password, address, referralCode } = req.body.customer;

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
        req.session.pendingSignup = { name, username, password, address, pincode, geometry, otp, otpExpiry, referralCode };
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

        res.redirect("/customer/verify-otp");

    } catch (e) {
        console.log(e);
        req.flash("danger", e.message || "Something went wrong. Please try again.");
        res.redirect("/customer/signup");
    }
}));

// STEP 2a: Show OTP verification page
router.get("/customer/verify-otp", isLoggedOut, (req, res) => {
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
        const referralCodeForNewUser = await generateReferralCode();

        const newCustomer = new Customer({
            name: pending.name,
            username: pending.username,
            address: pending.address,
            pincode: pending.pincode,
            geometry: pending.geometry,
            referralCode: referralCodeForNewUser
        });

        // Check if referred by someone
        if (pending.referralCode) {
            const ReferralUsage = require('../data/referralUsage');
            
            // Critical Anti-Fraud Check: Has this mobile number EVER claimed a referral code?
            const alreadyClaimed = await ReferralUsage.findOne({ mobile: pending.username });
            
            if (!alreadyClaimed) {
                const referrer = await Customer.findOne({ referralCode: pending.referralCode.toUpperCase() });
                if (referrer) {
                    newCustomer.referredBy = referrer._id;
                    newCustomer.coins = 5; // Reward new user

                    // Reward referrer
                    referrer.coins = (referrer.coins || 0) + 10;
                    referrer.referralCount = (referrer.referralCount || 0) + 1;
                    await referrer.save();
                    
                    // Permanent ledger entry preventing future farming if they delete account
                    await ReferralUsage.create({ 
                        mobile: pending.username,
                        usedCode: pending.referralCode.toUpperCase()
                    });
                }
            } else {
                console.log(`[Anti-Fraud] Blocked referral claim for mobile ${pending.username}. They already claimed one historically.`);
            }
        }

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
router.get("/alreadyLogin", isLoggedOut, (req, res) => {
    if (req.query.redirect) {
        req.session.redirectUrl = req.query.redirect;
    }
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
router.get("/forgot-password", isLoggedOut, (req, res) => {
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

    // Calculate Referral Leaderboard Top 3
    const top3Referrals = await Customer.find({ referralCount: { $gt: 0 } })
        .sort({ referralCount: -1, createdAt: 1 })
        .limit(3)
        .lean();

    // Calculate current user rank
    const userReferralCount = req.user.referralCount || 0;
    const higherRankUsersCount = await Customer.countDocuments({
        $or: [
            { referralCount: { $gt: userReferralCount } },
            { 
                referralCount: userReferralCount,
                createdAt: { $lt: req.user.createdAt }
            }
        ]
    });
    const currentUserRank = higherRankUsersCount + 1;

    res.render("pages/provider_profile.ejs", { listings, products, shops, kisanPosts, deliveryPartner, top3Referrals, currentUserRank });
}));

// these are verification route for customers 
router.get("/customer/verify", isLogedin, isadmin, async (req, res) => {
    if (String(req.user.username) !== '8709956547') {
        req.flash("error", "Unauthorized: Only super-admin can access this page.");
        return res.redirect("/");
    }
    let customers = await Customer.find();
    res.render("pages/userverification.ejs", { customers });
});

// set value true
router.put("/:id/verifycustomer", isLogedin, isadmin, async (req, res) => {
    if (String(req.user.username) !== '8709956547') {
        req.flash("error", "Unauthorized access.");
        return res.redirect("/");
    }
    let { id } = req.params;
    const { verified, verifedBy } = req.body.customer;
    console.log(verified)
    await Customer.findByIdAndUpdate(id, { verified, verifedBy });
    console.log("customer is verifed");
});

// we anything suspicious delete customer from database
router.delete("/customer/:id/verifyfail", isLogedin, isadmin, async (req, res) => {
    if (String(req.user.username) !== '8709956547') {
        req.flash("error", "Unauthorized access.");
        return res.redirect("/");
    }
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

// Hidden Account Deletion Page
router.get("/account/remove/permanent", isLogedin, (req, res) => {
    res.render("pages/delete_account.ejs");
});

// Comprehensive Account Deletion Process
router.post("/account/remove/permanent", isLogedin, wrapAsync(async (req, res) => {
    const { username, password } = req.body;
    const userId = req.user._id;

    try {
        // 1. Verification
        if (req.user.username != username) {
            req.flash("danger", "Phone number does not match your current account.");
            return res.redirect("/account/remove/permanent");
        }

        const user = await Customer.findById(userId);
        const isAuthenticated = await new Promise((resolve) => {
            user.authenticate(password, (err, result) => {
                resolve(!err && result);
            });
        });

        if (!isAuthenticated) {
            req.flash("danger", "Incorrect password. Verification failed.");
            return res.redirect("/account/remove/permanent");
        }

        console.log(`\nDeleting Account: ${user.name} (${user.username})`);
        const cloudinary = require("../cloud_con.js");

        // 2. Delete Service Provider Listings & Images
        const providers = await Provider.find({ owner: userId });
        for (let p of providers) {
            if (p.personImage?.length) {
                for (let img of p.personImage) {
                    if (img.filename) await cloudinary.uploader.destroy(img.filename).catch(e => console.error(e));
                }
            }
            if (p.review?.length) await Review.deleteMany({ _id: { $in: p.review } });
            await Provider.findByIdAndDelete(p._id);
        }

        // 3. Delete Shops & Images
        const shops = await Shop.find({ owner: userId });
        for (let s of shops) {
            if (s.shopImage?.length) {
                for (let img of s.shopImage) {
                    if (img.filename) await cloudinary.uploader.destroy(img.filename).catch(e => console.error(e));
                }
            }
            // Delete shop item images if they exist
            if (s.items?.length) {
                for (let item of s.items) {
                    if (item.itemImage?.filename) await cloudinary.uploader.destroy(item.itemImage.filename).catch(e => console.error(e));
                }
            }
            if (s.reviews?.length) await Review.deleteMany({ _id: { $in: s.reviews } });
            await Shop.findByIdAndDelete(s._id);
        }

        // 4. Delete Products & Images
        const products = await Product.find({ owner: userId });
        for (let prod of products) {
            if (prod.productImage?.length) {
                for (let img of prod.productImage) {
                    if (img.filename) await cloudinary.uploader.destroy(img.filename).catch(e => console.error(e));
                }
            }
            await Product.findByIdAndDelete(prod._id);
        }

        // 5. Delete Kisan Sabha Content & Images
        const posts = await KeshanSabhaPost.find({ author: userId });
        for (let post of posts) {
            if (post.media?.length) {
                for (let m of post.media) {
                    if (m.filename) await cloudinary.uploader.destroy(m.filename).catch(e => console.error(e));
                }
            }
            await KeshanSabhaPost.findByIdAndDelete(post._id);
        }
        await KeshanSabhaComment.deleteMany({ author: userId });
        await KeshanSabhaReport.deleteMany({ author: userId });

        // 6. Delete Other Associations
        await DeliveryPartner.deleteMany({ user: userId });
        await Notification.deleteMany({ recipient: userId });
        await Review.deleteMany({ author: userId });

        // 7. Final Account Deletion
        await Customer.findByIdAndDelete(userId);

        // Notify Admin via WhatsApp (Optional step from previous code)
        const whatsappMsg = `🚨 Data Purge Complete: ${encodeURIComponent(user.name)} (${user.username}) deleted their PaSr account.`;
        const whatsappUrl = `https://wa.me/918252271535?text=${whatsappMsg}`;

        req.logout((err) => {
            if (err) console.error(err);
            res.send(`
                <html>
                <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fee2e2;">
                    <h1 style="color: #dc2626;">Account Deleted</h1>
                    <p>All your data has been permanently removed from PaSr.</p>
                    <p>Redirecting to home page...</p>
                    <script>
                        setTimeout(() => window.location.href = "/", 3000);
                        window.open('${whatsappUrl}', '_blank');
                    </script>
                </body>
                </html>
            `);
        });

    } catch (error) {
        console.error("Deletion Error:", error);
        req.flash("danger", "Step-wise deletion failed. Please contact admin.");
        res.redirect("/account/remove/permanent");
    }
}));


// API: Update Address
router.post("/api/user/update-address", isLogedin, wrapAsync(userController.updateAddress));

// API: Add Saved Address
router.post("/api/user/saved-addresses", isLogedin, wrapAsync(async (req, res) => {
    const { label, addressStr } = req.body;
    
    if (!addressStr) {
        return res.status(400).json({ success: false, message: "Address is required" });
    }
    
    // Geocode to get coordinates
    let geometry;
    try {
        const coordinate = await forwardGeocode(addressStr);
        if (!coordinate.body.features.length) {
            return res.status(400).json({ success: false, message: "No location found for this address. Try being more specific." });
        }
        geometry = coordinate.body.features[0].geometry;
    } catch (e) {
        return res.status(500).json({ success: false, message: "Geocoding failed" });
    }

    const customer = await Customer.findById(req.user._id);
    
    // Check if it's the first one, make it default
    const isDefault = customer.savedAddresses.length === 0;

    customer.savedAddresses.push({
        label: label || 'Other',
        addressStr,
        geometry,
        isDefault
    });

    await customer.save();
    res.json({ success: true, message: "Address saved successfully", addresses: customer.savedAddresses });
}));

// API: Delete Saved Address
router.delete("/api/user/saved-addresses/:addressId", isLogedin, wrapAsync(async (req, res) => {
    const { addressId } = req.params;
    const customer = await Customer.findById(req.user._id);
    
    customer.savedAddresses = customer.savedAddresses.filter(addr => addr._id.toString() !== addressId);
    await customer.save();
    
    res.json({ success: true, message: "Address removed", addresses: customer.savedAddresses });
}));

module.exports = router;
