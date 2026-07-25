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
// const { sendWhatsAppOTP } = require("../utils/whatsappHelper"); // Replaced by MSG91
const { sendOTP, verifyOTP } = require("../utils/msg91Helper");

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
            req.flash("danger", "This mobile number is already registered. Please log in.");
            return res.redirect("/customer/signup");
        }

        let pincode = null;
        let geometry = null;

        if (address && address.trim() !== '') {
            // Geocode the address to get coordinates
            const geoData = await forwardGeocode(address);

            if (!geoData.body.features || geoData.body.features.length === 0) {
                req.flash("danger", "Could not verify address location. Please enter a valid address.");
                return res.redirect("/customer/signup");
            }

            const context = geoData.body.features[0].context;
            if (context) {
                const pinCtx = context.find(c => c && c.id && (c.id.startsWith('postcode') || c.id === 'postal_code'));
                if (pinCtx) pincode = parseInt(pinCtx.text);
            }
            geometry = geoData.body.features[0].geometry;
        }

        // Save pending data in session (no OTP stored here — MSG91 owns the OTP)
        const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes (for session expiry guard)
        req.session.pendingSignup = { name, username, password, address, pincode, geometry, otpExpiry, referralCode };
        await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

        try {
            await sendOTP(username);
        } catch (error) {
            console.error("Failed to send OTP via MSG91:", error.message);
            req.flash("warning", "There was an issue sending the OTP, please try again later.");
        }

        res.redirect("/customer/verify-otp");

    } catch (e) {
        console.error(e);
        req.flash("danger", e.message || "Something went wrong. Please try again.");
        res.redirect("/customer/signup");
    }
}));

// STEP 2a: Show OTP verification page
router.get("/customer/verify-otp", isLoggedOut, (req, res) => {
    if (!req.session.pendingSignup) {
        req.flash("danger", "Session expired. Please fill the registration form again.");
        return res.redirect("/customer/signup");
    }
    res.render("pages/otpVerify.ejs", { phone: req.session.pendingSignup.username, otp: req.session.pendingSignup.otp });
});

// STEP 2b: Verify OTP and complete registration
router.post("/customer/verify-otp", wrapAsync(async (req, res, next) => {

    const pending = req.session.pendingSignup;

    if (!pending) {
        req.flash("danger", "Session expired. Please fill the registration form again.");
        return res.redirect("/customer/signup");
    }

    if (Date.now() > pending.otpExpiry) {
        req.session.pendingSignup = null;
        req.flash("danger", "OTP expired. Please try creating your account again.");
        return res.redirect("/customer/signup");
    }

    const enteredOtp = (req.body.otp || "").trim();
    // Verify OTP with MSG91
    const otpValid = await verifyOTP(pending.username, enteredOtp);
    if (!otpValid) {
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
            req.flash("success", "Mobile number verified! Welcome to PaSr 🎉");
            req.session.save(() => res.redirect("/home"));
        });

    } catch (e) {
        console.error(e);
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

        console.log("Login succeeded, logging user in...");
        require('fs').appendFileSync('debug.log', 'Login succeeded, logging user in...\n');
        // Login succeeded, log the user in
        req.logIn(user, (err) => {
            require('fs').appendFileSync('debug.log', 'req.logIn callback reached, err: ' + err + '\n');
            console.log("req.logIn callback reached, err:", err);
            if (err) return next(err);

            // Clear the failed attempts counter on success
            req.session.failedLoginAttempts = 0;
            req.flash("success", "Welcome to Back!");

            console.log("Saving session explicitly before redirect...");
            req.session.save((err) => {
                if (err) {
                    console.error("Session save error:", err);
                    return next(err);
                }
                console.log("Session saved successfully, redirecting...");
                res.redirect(res.locals.redirectUrl || "/home");
            });
        });
    })(req, res, next);
});

// ─── JWT API AUTH FOR MOBILE (FLUTTER) ───────────────────────────────────────
const jwt = require("jsonwebtoken");

router.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", { session: true }, (err, user, info) => {
        if (err) return res.status(500).json({ success: false, message: "Internal Server Error" });
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid mobile number or password" });
        }

        req.logIn(user, async (err) => {
            if (err) return res.status(500).json({ success: false, message: "Internal Server Error" });

            let refCode = user.referralCode;
            if (!refCode) {
                refCode = await generateReferralCode();
                user.referralCode = refCode;
                await user.save();
            }

            // Generate JWT
            const token = jwt.sign(
                { id: user._id, username: user.username },
                process.env.SECRET || "fallback_secret_for_dev",
                { expiresIn: "30d" }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    address: user.address,
                    coins: user.coins,
                    referralCode: refCode,
                    referralCount: user.referralCount || 0
                }
            });
        });
    })(req, res, next);
});

// POST /api/auth/register — Step 1: Validate, send OTP, store in session
router.post("/api/auth/register", wrapAsync(async (req, res) => {
    const { name, username, password, address, referralCode } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Mobile number and password are required." });
    }

    const existing = await Customer.findOne({ username: Number(username) });
    if (existing) {
        return res.status(409).json({ success: false, message: "This mobile number is already registered. Please log in." });
    }

    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store pending signup in session (MSG91 owns the OTP, not us)
    req.session.pendingSignup = { name, username, password, address, otpExpiry, referralCode };
    await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

    try {
        await sendOTP(username);
    } catch (err) {
        console.error("[API Signup] MSG91 OTP failed:", err.message);
    }

    res.json({ success: true, message: "OTP sent to your mobile number via SMS." });
}));

// POST /api/auth/verify-otp — Step 2: Verify OTP, create account, return JWT
router.post("/api/auth/verify-otp", wrapAsync(async (req, res) => {
    const { otp } = req.body;
    const pending = req.session.pendingSignup;

    if (!pending) return res.status(400).json({ success: false, message: "Session expired. Please restart registration." });
    if (Date.now() > pending.otpExpiry) {
        req.session.pendingSignup = null;
        return res.status(400).json({ success: false, message: "OTP expired. Please register again." });
    }
    // Verify OTP with MSG91
    const otpValid = await verifyOTP(pending.username, (otp || "").trim());
    if (!otpValid) {
        return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    const referralCodeForNewUser = await generateReferralCode();
    const newCustomer = new Customer({
        name: pending.name,
        username: pending.username,
        address: pending.address,
        referralCode: referralCodeForNewUser
    });

    if (pending.referralCode) {
        const ReferralUsage = require('../data/referralUsage');
        const alreadyClaimed = await ReferralUsage.findOne({ mobile: pending.username });
        if (!alreadyClaimed) {
            const referrer = await Customer.findOne({ referralCode: pending.referralCode.toUpperCase() });
            if (referrer) {
                newCustomer.referredBy = referrer._id;
                newCustomer.coins = 5;
                referrer.coins = (referrer.coins || 0) + 10;
                referrer.referralCount = (referrer.referralCount || 0) + 1;
                await referrer.save();
                await ReferralUsage.create({ mobile: pending.username, usedCode: pending.referralCode.toUpperCase() });
            }
        }
    }

    const registeredUser = await Customer.register(newCustomer, pending.password);
    req.session.pendingSignup = null;

    req.logIn(registeredUser, (err) => {
        if (err) return res.status(500).json({ success: false, message: "Login failed after registration" });

        const token = jwt.sign(
            { id: registeredUser._id, username: registeredUser.username },
            process.env.SECRET || "fallback_secret_for_dev",
            { expiresIn: "30d" }
        );

        res.json({
            success: true,
            token,
            user: {
                id: registeredUser._id,
                name: registeredUser.name,
                username: registeredUser.username,
                address: registeredUser.address,
                coins: registeredUser.coins || 0,
                referralCode: registeredUser.referralCode,
                referralCount: registeredUser.referralCount || 0
            }
        });
    });
}));
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── MOBILE APP — FORGOT PASSWORD (OTP-based, stateless JSON) ───────────────
// POST /api/auth/forgot-password  →  send 6-digit OTP to user's WhatsApp
router.post("/api/auth/forgot-password", wrapAsync(async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const user = await Customer.findOne({ username: Number(username) });
    if (!user) {
        return res.status(404).json({ success: false, message: "No account found with this mobile number." });
    }

    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store metadata in session (MSG91 owns the OTP)
    req.session.passwordResetOtp = { username: String(username), otpExpiry };
    await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

    try {
        await sendOTP(username);
    } catch (err) {
        console.error("[API ForgotPassword] MSG91 OTP failed:", err.message);
        // Don't fail — user can retry
    }

    res.json({ success: true, message: "OTP sent to your mobile number via SMS." });
}));

// POST /api/auth/reset-password  →  verify OTP + set new password
router.post("/api/auth/reset-password", wrapAsync(async (req, res) => {
    const { username, otp, newPassword } = req.body;

    if (!username || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: "Phone, OTP, and new password are required." });
    }

    const pending = req.session.passwordResetOtp;

    if (!pending || pending.username !== String(username)) {
        return res.status(400).json({ success: false, message: "Session expired. Please request a new OTP." });
    }

    if (Date.now() > pending.otpExpiry) {
        req.session.passwordResetOtp = null;
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP with MSG91
    const otpValid = await verifyOTP(username, otp.trim());
    if (!otpValid) {
        return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });
    }

    if (newPassword.length < 4) {
        return res.status(400).json({ success: false, message: "Password must be at least 4 characters." });
    }

    const user = await Customer.findOne({ username: Number(username) });
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
    }

    await user.setPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    // Clear the OTP from session
    req.session.passwordResetOtp = null;

    res.json({ success: true, message: "Password updated successfully! Please log in with your new password." });
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
    await Customer.findByIdAndUpdate(id, { verified, verifedBy });
});

// we anything suspicious delete customer from database
router.delete("/customer/:id/verifyfail", isLogedin, isadmin, async (req, res) => {
    if (String(req.user.username) !== '8709956547') {
        req.flash("error", "Unauthorized access.");
        return res.redirect("/");
    }
    let { id } = req.params;
    await Customer.findByIdAndDelete(id);
    // deletion log removed
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

    console.log(`[Account Deletion] STARTED for User: ${req.user.username} (${userId})`);

    try {
        const currentUsername = String(req.user.username);
        const inputUsername = String(username);

        if (currentUsername !== inputUsername) {
            console.warn(`[Account Deletion] ABORT: Username mismatch`);
            req.flash("danger", "Phone number does not match your current account.");
            return res.redirect("/user");
        }

        const user = await Customer.findById(userId);
        if (!user) {
            console.error(`[Account Deletion] ABORT: User not found in DB`);
            req.flash("danger", "Account not found.");
            return res.redirect("/home");
        }

        console.log(`[Account Deletion] Authenticating password for ${currentUsername}...`);
        const isAuthenticated = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn("[Account Deletion] Auth Timeout: Verification taking too long.");
                resolve(false);
            }, 5000);

            Customer.authenticate()(currentUsername, password, (err, userResult, msg) => {
                clearTimeout(timeout);
                if (err) console.error(`[Account Deletion] Auth Error: ${err.message}`);
                resolve(!!userResult);
            });
        });

        if (!isAuthenticated) {
            console.warn(`[Account Deletion] ABORT: Password verification failed`);
            req.flash("danger", "Incorrect password. Identity verification failed.");
            return res.redirect("/user");
        }

        console.log(`[Account Deletion] Auth successful. Starting resilient data purge for ${user.name}...`);
        const cloudinary = require("../cloud_con.js");
        const deletePromises = [];

        // 1. Providers Purge
        try {
            const providers = await Provider.find({ owner: userId });
            for (let p of providers) {
                if (p.personImage?.length) {
                    for (let img of p.personImage) {
                        if (img.filename) deletePromises.push(cloudinary.uploader.destroy(img.filename).catch(e => { }));
                    }
                }
                if (p.review?.length) await Review.deleteMany({ _id: { $in: p.review } });
                await Provider.findByIdAndDelete(p._id);
            }
            console.log(`[Account Deletion] - Providers purged`);
        } catch (e) { console.error(`[Account Deletion] Provider purge error: ${e.message}`); }

        // 2. Shops Purge
        try {
            const shops = await Shop.find({ owner: userId });
            for (let s of shops) {
                if (s.shopImage?.length) {
                    for (let img of s.shopImage) {
                        if (img.filename) deletePromises.push(cloudinary.uploader.destroy(img.filename).catch(e => { }));
                    }
                }
                if (s.items?.length) {
                    for (let item of s.items) {
                        if (item.itemImage?.filename) deletePromises.push(cloudinary.uploader.destroy(item.itemImage.filename).catch(e => { }));
                    }
                }
                if (s.reviews?.length) await Review.deleteMany({ _id: { $in: s.reviews } });
                await Shop.findByIdAndDelete(s._id);
            }
            console.log(`[Account Deletion] - Shops purged`);
        } catch (e) { console.error(`[Account Deletion] Shop purge error: ${e.message}`); }

        // 3. Products Purge
        try {
            const products = await Product.find({ owner: userId });
            for (let prod of products) {
                if (prod.productImage?.length) {
                    for (let img of prod.productImage) {
                        if (img.filename) deletePromises.push(cloudinary.uploader.destroy(img.filename).catch(e => { }));
                    }
                }
                await Product.findByIdAndDelete(prod._id);
            }
            console.log(`[Account Deletion] - Products purged`);
        } catch (e) { console.error(`[Account Deletion] Product purge error: ${e.message}`); }

        // 4. Kisan Sabha Purge
        try {
            const posts = await KeshanSabhaPost.find({ author: userId });
            for (let post of posts) {
                if (post.media?.length) {
                    for (let m of post.media) {
                        if (m.filename) deletePromises.push(cloudinary.uploader.destroy(m.filename).catch(e => { }));
                    }
                }
                await KeshanSabhaPost.findByIdAndDelete(post._id);
            }
            await KeshanSabhaComment.deleteMany({ author: userId });
            await KeshanSabhaReport.deleteMany({ author: userId });
            console.log(`[Account Deletion] - Kisan Sabha content purged`);
        } catch (e) { console.error(`[Account Deletion] Kisan Sabha purge error: ${e.message}`); }

        // 5. Associations Purge
        try {
            await DeliveryPartner.deleteMany({ user: userId });
            await Notification.deleteMany({ recipient: userId });
            await Review.deleteMany({ author: userId });
            console.log(`[Account Deletion] - Associations purged`);
        } catch (e) { console.error(`[Account Deletion] Association purge error: ${e.message}`); }

        // 6. Final Critical Deletion
        await Customer.findByIdAndDelete(userId);
        console.log(`[Account Deletion] SUCCESS: CUSTOMER RECORD DELETED`);

        // Background Cloudinary deletions
        if (deletePromises.length > 0) {
            Promise.all(deletePromises).catch(e => console.error("[Account Deletion] Background image purge error:", e.message));
        }

        console.log(`[Account Deletion] Logging out...`);
        req.logout((err) => {
            if (err) console.error(`[Account Deletion] Logout Error: ${err.message}`);
            req.flash("success", "Account successfully deleted.");
            res.redirect("/home");
        });

    } catch (error) {
        console.error(`[Account Deletion] CRITICAL ERROR: ${error.message}`);
        req.flash("danger", "Something went wrong during deletion. Please contact support.");
        res.redirect("/user");
    }
}));


// API: Get current user profile
router.get("/api/user/profile", isLogedin, wrapAsync(async (req, res) => {
    let refCode = req.user.referralCode;
    if (!refCode) {
        refCode = await generateReferralCode();
        req.user.referralCode = refCode;
        await req.user.save();
    }

    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            username: req.user.username,
            address: req.user.address,
            coins: req.user.coins,
            referralCode: refCode,
            referralCount: req.user.referralCount || 0,
            geometry: req.user.geometry || null,
            mandatoryOnlineOrdersCount: req.user.mandatoryOnlineOrdersCount || 0
        }
    });
}));

// API: Update Address
router.post("/api/user/update-address", isLogedin, wrapAsync(userController.updateAddress));

// API: Complete Profile (Progressive Profiling)
router.post("/api/user/complete-profile", isLogedin, wrapAsync(async (req, res) => {
    const { name, address, additionalPhone } = req.body;
    if (!name || !address) {
        return res.status(400).json({ success: false, message: "Name and address are required" });
    }

    let geometry = null;
    let pincode = null;
    try {
        const coordinate = await forwardGeocode(address);
        if (coordinate.body.features && coordinate.body.features.length > 0) {
            geometry = coordinate.body.features[0].geometry;
            const context = coordinate.body.features[0].context;
            if (context) {
                const pinCtx = context.find(c => c && c.id && (c.id.startsWith('postcode') || c.id === 'postal_code'));
                if (pinCtx) pincode = parseInt(pinCtx.text);
            }
        }
    } catch (e) {
        console.error("Geocoding failed for profile completion", e);
    }

    await Customer.findByIdAndUpdate(req.user._id, {
        name,
        address,
        additionalPhone,
        ...(geometry && { geometry }),
        ...(pincode && { pincode })
    });

    res.json({ success: true, message: "Profile updated successfully" });
}));

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
