const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { cloudinary } = require('../cloud_con');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const Customer = require('../data/customers');
const Shop = require('../data/shops');
const Item = require('../data/item');
const Order = require('../data/order');

// Cloudinary Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pasr_shops',
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp']
  }
});
const upload = multer({ storage: storage });

const signupJoiSchema = Joi.object({
    name: Joi.string().required().min(3).messages({'string.min': 'Name must be at least 3 characters'}),
    username: Joi.string().pattern(/^[0-9]{10}$/).required().messages({'string.pattern.base': 'Must be a 10-digit WhatsApp number'}),
    password: Joi.string().required().min(4).messages({'string.min': 'Password must be at least 4 characters'}),
    confirmPassword: Joi.any(),
    address: Joi.string().required(),
    referralCode: Joi.string().allow('', null)
});

const loginJoiSchema = Joi.object({
    username: Joi.string().pattern(/^[0-9]{10}$/).required().messages({'string.pattern.base': 'Must be a 10-digit WhatsApp number'}),
    password: Joi.string().required()
});

// Auth Routes
router.post('/auth/signup-step1', async (req, res) => {
    try {
        const { error } = signupJoiSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { name, username, password, address, referralCode } = req.body;
        
        const numericUsername = Number(username);
        let existing = await Customer.findOne({ username: numericUsername });
        if (existing) {
            if (existing.verified) return res.status(400).json({ error: "WhatsApp number is already registered." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        if (!existing) {
            existing = new Customer({
                name, username: numericUsername, address, referralCode, verified: false, otp, otpExpiry
            });

            try {
                if (process.env.GOOGLE_MAP_API_KEY) {
                    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAP_API_KEY}`;
                    const geoReq = await fetch(geoUrl);
                    const geoRes = await geoReq.json();
                    if (geoRes.status === "OK" && geoRes.results.length > 0) {
                        const loc = geoRes.results[0].geometry.location;
                        existing.geometry = { type: "Point", coordinates: [loc.lng, loc.lat] };
                    }
                }
            } catch (geoErr) {
                console.error("Geocoding failed during signup:", geoErr.message);
            }

            await Customer.register(existing, password); // Hashes password using passport-local-mongoose
        } else {
            await existing.setPassword(password); // Resets passport-local-mongoose hash
            existing.otp = otp;
            existing.otpExpiry = otpExpiry;
            await existing.save();
        }

        res.status(200).json({ message: "OTP Generated", requiresOtp: true, otp: otp }); 
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Server error during signup" });
    }
});

router.post('/auth/verify-otp', async (req, res) => {
    try {
        const { username, otp } = req.body;
        const numericUsername = Number(username);
        const user = await Customer.findOne({ username: numericUsername });

        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.verified) return res.status(400).json({ error: "User already verified" });
        
        if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
        if (user.otpExpiry < new Date()) return res.status(400).json({ error: "OTP has expired" });

        user.verified = true;
        user.otp = null;
        user.otpExpiry = null;
        
        await user.save();
        res.status(200).json({ message: "WhatsApp number verified! Welcome to PaSr 🎉", user: { id: user._id, name: user.name, username: user.username } });
    } catch (err) {
        res.status(500).json({ error: "Server error during OTP verification" });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { error } = loginJoiSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { username, password } = req.body;
        const numericUsername = Number(username);
        
        const customer = await Customer.findOne({ username: numericUsername });
        if (!customer) return res.status(401).json({ error: "Invalid credentials" });

        // Authenticate using passport-local-mongoose method
        const { user: authedUser, error: authError } = await customer.authenticate(password);
        if (authError || !authedUser) return res.status(401).json({ error: "Invalid credentials" });
        
        if (!customer.verified) return res.status(401).json({ error: "Account not verified. Please sign up again to verify your number." });
        
        const coords = customer.geometry?.coordinates || null;
        res.json({ message: "Login successful!", user: { id: customer._id, name: customer.name, username: customer.username, coordinates: coords } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
});

// API Routes
router.post('/shops', upload.single('shopImage'), async (req, res) => {
    try {
        const { shopName, category, location, openingTime, closingTime, shopDescription, upiId, gstNumber, ownerId } = req.body;
        
        if (!ownerId) return res.status(401).json({ error: "Unauthorized. Missing Application Owner ID." });
        
        let shopImageArray = [];
        if (req.file) {
            shopImageArray.push({ url: req.file.path, filename: req.file.filename });
        }

        const newShop = new Shop({
            shopName,
            category,
            location,
            openingTime,
            closingTime,
            shopDescription,
            upiId,
            gstNumber,
            shopImage: shopImageArray,
            owner: ownerId,
            verified: false // Shops start unverified
        });

        await newShop.save();
        res.status(201).json({ message: "Shop created successfully and pending verification!", shop: newShop });
    } catch (err) {
        console.error("Create shop error:", err);
        res.status(500).json({ error: "Failed to create shop." });
    }
});

router.post('/shops/:id/items', upload.single('itemImage'), async (req, res) => {
    try {
        const { name, price, quantity, itemCategory, description, sizes } = req.body;
        const shopId = req.params.id;
        
        const shop = await Shop.findById(shopId);
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        let imgData = { url: "", filename: "" };
        if (req.file) {
            imgData = { url: req.file.path, filename: req.file.filename };
        }

        const newItem = new Item({
            name,
            price: Number(price),
            quantity: Number(quantity),
            itemCategory,
            description,
            sizes: sizes ? sizes.split(',') : [],
            img: imgData,
            shop: shopId
        });

        await newItem.save();
        
        // Add item reference to shop
        shop.items.push(newItem._id);
        await shop.save();

        res.status(201).json({ message: "Product added successfully!", item: newItem });
    } catch (err) {
        console.error("Add item error:", err);
        res.status(500).json({ error: "Failed to add product/item." });
    }
});

router.get('/geocode', async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) return res.status(400).json({ error: "Address is required" });
        
        const apiKey = process.env.GOOGLE_MAP_API_KEY;
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        
        const geocodeObj = await fetch(geoUrl).then(r => r.json());
        if (geocodeObj.status === "OK" && geocodeObj.results.length > 0) {
            const loc = geocodeObj.results[0].geometry.location;
            return res.json({ lat: loc.lat, lng: loc.lng, formattedAddress: geocodeObj.results[0].formatted_address });
        } else {
            return res.status(400).json({ error: "Could not resolve address. Please be more specific." });
        }
    } catch (err) {
        console.error("Geocoding Error:", err);
        return res.status(500).json({ error: "Internal Geocoding Error" });
    }
});

router.get('/shops', async (req, res) => {
    try {
        let { lat, lng, range, category } = req.query;
        let query = { verified: true };
        
        if (category && category !== 'All Categories') {
            query.category = category;
        }

        if (lat && lng) {
            range = parseInt(range) || 5;
            if (range > 50) range = 50; 
            
            query.geometry = {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: range * 1000 // meters
                }
            };
            const shops = await Shop.find(query).limit(50);
            return res.json(shops);
        }

        const shops = await Shop.find(query).sort({ createdAt: -1 }).limit(20);
        res.json(shops);
    } catch (err) {
        console.error("Error fetching shops:", err);
        res.status(500).json({ error: "Failed to fetch shops" });
    }
});

router.get('/shops/owner/:ownerId', async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.params.ownerId }).populate('items');
        if (!shop) return res.status(404).json({ error: "Shop not found for this owner" });
        
        const orders = await Order.find({ shopId: shop._id }).sort({ createdAt: -1 });
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || order.subtotalAmount || 0), 0);
        
        const shopData = shop.toObject();
        shopData.totalOrders = totalOrders;
        shopData.totalRevenue = totalRevenue;
        shopData.ordersList = orders; // Attach full order history

        res.json(shopData);
    } catch (err) {
        console.error("GET SHOP BY OWNER ERROR:", err);
        res.status(500).json({ error: "Failed to fetch shop details" });
    }
});

router.get('/shops/:id', async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.id).populate('owner').populate('items');
        if (!shop) return res.status(404).json({ error: "Shop not found" });
        res.json(shop);
    } catch (err) {
        console.error("GET SHOP ERROR:", err);
        res.status(500).json({ error: "Failed to fetch shop details" });
    }
});

router.put('/items/:id', async (req, res) => {
    try {
        const { name, price, quantity, itemCategory, description } = req.body;
        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id, 
            { name, price, quantity, itemCategory, description },
            { new: true }
        );
        if (!updatedItem) return res.status(404).json({ error: "Item not found" });
        res.json(updatedItem);
    } catch (err) {
        console.error("PUT ITEM ERROR:", err);
        res.status(500).json({ error: "Failed to update item" });
    }
});

module.exports = router;
