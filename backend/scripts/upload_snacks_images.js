const mongoose = require("mongoose");
const MasterProduct = require("../data/masterProduct");
const ItemImageRegistry = require("../data/itemImageRegistry");
const { normalizeItemName } = require("../utils/normalization");
const { cloudinary } = require("../cloud_con");
const https = require("https");
require('dotenv').config();

const productsToUpload = [
    // Biscuits
    { name: "Parle G", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Parle G ₹5 Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Parle G ₹10 Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Parle G ₹20 Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Parle G Family Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Britannia Marie Gold", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Marie Gold ₹5", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Marie Gold ₹10", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Marie Gold ₹20", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Marie Gold Family Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Good Day", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Good Day Small Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Good Day ₹10 Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Good Day Creamy Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Good Day Family Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Bourbon", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Bourbon ₹10 Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Bourbon ₹20 Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Bourbon Family Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Little Hearts", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Little Hearts Small Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Little Hearts Medium Pack", brand: "Britannia", category: "Snacks & Namkeen" },

    // Premium Biscuits
    { name: "Hide & Seek", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Hide & Seek ₹10 Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Hide & Seek Fab Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Hide & Seek Family Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Jim Jam", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Jim Jam Small Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Jim Jam Medium Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Monaco", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Monaco ₹5 Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Monaco ₹10 Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Monaco Classic Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Tiger Biscuit", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Tiger ₹5 Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Tiger ₹10 Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Tiger Glucose Family Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Krackjack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Krackjack ₹10 Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Krackjack Family Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "50-50", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia 50-50 Small Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia 50-50 Family Pack", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "NutriChoice", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "NutriChoice Digestive Small", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "NutriChoice Digestive Large", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Dark Fantasy", brand: "Sunfeast", category: "Snacks & Namkeen" },
    { name: "Dark Fantasy Small Box", brand: "Sunfeast", category: "Snacks & Namkeen" },
    { name: "Dark Fantasy Gift Pack", brand: "Sunfeast", category: "Snacks & Namkeen" },

    // Chips & Namkeen
    { name: "Lays", brand: "Lays", category: "Snacks & Namkeen" },
    { name: "Lays ₹5 Pack", brand: "Lays", category: "Snacks & Namkeen" },
    { name: "Lays ₹10 Pack", brand: "Lays", category: "Snacks & Namkeen" },
    { name: "Lays ₹20 Pack", brand: "Lays", category: "Snacks & Namkeen" },
    { name: "Lays Family Pack", brand: "Lays", category: "Snacks & Namkeen" },
    { name: "Kurkure", brand: "Kurkure", category: "Snacks & Namkeen" },
    { name: "Kurkure ₹5 Pack", brand: "Kurkure", category: "Snacks & Namkeen" },
    { name: "Kurkure ₹10 Pack", brand: "Kurkure", category: "Snacks & Namkeen" },
    { name: "Kurkure ₹20 Pack", brand: "Kurkure", category: "Snacks & Namkeen" },
    { name: "Kurkure Large Pack", brand: "Kurkure", category: "Snacks & Namkeen" },
    { name: "Bingo Mad Angles", brand: "Bingo", category: "Snacks & Namkeen" },
    { name: "Bingo Mad Angles Small", brand: "Bingo", category: "Snacks & Namkeen" },
    { name: "Bingo Mad Angles Medium", brand: "Bingo", category: "Snacks & Namkeen" },
    { name: "Bingo Mad Angles Large", brand: "Bingo", category: "Snacks & Namkeen" },
    { name: "Uncle Chips", brand: "Uncle Chips", category: "Snacks & Namkeen" },
    { name: "Uncle Chips Small Pack", brand: "Uncle Chips", category: "Snacks & Namkeen" },
    { name: "Uncle Chips Medium Pack", brand: "Uncle Chips", category: "Snacks & Namkeen" },
    { name: "Haldiram Bhujia", brand: "Haldiram", category: "Snacks & Namkeen" },
    { name: "Haldiram Bhujia ₹10", brand: "Haldiram", category: "Snacks & Namkeen" },
    { name: "Haldiram Bhujia ₹20", brand: "Haldiram", category: "Snacks & Namkeen" },
    { name: "Haldiram Bhujia Large Pack", brand: "Haldiram", category: "Snacks & Namkeen" },
    { name: "Haldiram Mixture Small", brand: "Haldiram", category: "Snacks & Namkeen" },
    { name: "Haldiram Mixture Family Pack", brand: "Haldiram", category: "Snacks & Namkeen" },
    { name: "Balaji Wafers Small", brand: "Balaji", category: "Snacks & Namkeen" },
    { name: "Balaji Wafers Medium", brand: "Balaji", category: "Snacks & Namkeen" },
    { name: "Too Yumm Chips Small", brand: "Too Yumm", category: "Snacks & Namkeen" },
    { name: "Too Yumm Large Pack", brand: "Too Yumm", category: "Snacks & Namkeen" },
    { name: "Pringles Mini Can", brand: "Pringles", category: "Snacks & Namkeen" },
    { name: "Pringles Regular Can", brand: "Pringles", category: "Snacks & Namkeen" },

    // Instant Noodles
    { name: "Maggi", brand: "Maggi", category: "Snacks & Namkeen" },
    { name: "Maggi ₹5 Pack", brand: "Maggi", category: "Snacks & Namkeen" },
    { name: "Maggi ₹10 Pack", brand: "Maggi", category: "Snacks & Namkeen" },
    { name: "Maggi 2-Minute Single Pack", brand: "Maggi", category: "Snacks & Namkeen" },
    { name: "Maggi 4 Pack Combo", brand: "Maggi", category: "Snacks & Namkeen" },
    { name: "Maggi Family Pack", brand: "Maggi", category: "Snacks & Namkeen" },
    { name: "Yippee", brand: "Sunfeast", category: "Snacks & Namkeen" },
    { name: "Yippee Single Pack", brand: "Sunfeast", category: "Snacks & Namkeen" },
    { name: "Yippee Magic Masala Pack", brand: "Sunfeast", category: "Snacks & Namkeen" },
    { name: "Yippee Family Pack", brand: "Sunfeast", category: "Snacks & Namkeen" },
    { name: "Top Ramen", brand: "Top Ramen", category: "Snacks & Namkeen" },
    { name: "Top Ramen Curry Pack", brand: "Top Ramen", category: "Snacks & Namkeen" },
    { name: "Top Ramen Masala Pack", brand: "Top Ramen", category: "Snacks & Namkeen" },
    { name: "Wai Wai", brand: "Wai Wai", category: "Snacks & Namkeen" },
    { name: "Wai Wai Single Pack", brand: "Wai Wai", category: "Snacks & Namkeen" },
    { name: "Wai Wai Big Pack", brand: "Wai Wai", category: "Snacks & Namkeen" },

    // Chocolates
    { name: "Cadbury Dairy Milk", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Dairy Milk ₹5", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Dairy Milk ₹10", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Dairy Milk ₹20", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Dairy Milk ₹40", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Dairy Milk Silk", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "KitKat", brand: "Nestle", category: "Snacks & Namkeen" },
    { name: "KitKat ₹10", brand: "Nestle", category: "Snacks & Namkeen" },
    { name: "KitKat ₹20", brand: "Nestle", category: "Snacks & Namkeen" },
    { name: "KitKat Dessert Pack", brand: "Nestle", category: "Snacks & Namkeen" },
    { name: "Five Star ₹5", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Five Star ₹10", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Perk ₹5", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Perk ₹10", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Munch ₹5", brand: "Nestle", category: "Snacks & Namkeen" },
    { name: "Munch ₹10", brand: "Nestle", category: "Snacks & Namkeen" },
    { name: "Snickers Mini", brand: "Mars", category: "Snacks & Namkeen" },
    { name: "Snickers Bar", brand: "Mars", category: "Snacks & Namkeen" },
    { name: "Mars Bar", brand: "Mars", category: "Snacks & Namkeen" },
    { name: "Bounty Bar", brand: "Mars", category: "Snacks & Namkeen" },
    { name: "Kinder Joy", brand: "Kinder", category: "Snacks & Namkeen" },
    { name: "Toblerone Small", brand: "Mondelēz", category: "Snacks & Namkeen" },
    { name: "Ferrero Rocher Box", brand: "Ferrero", category: "Snacks & Namkeen" },

    // Candy & Gum
    { name: "Pulse Candy", brand: "DS Group", category: "Snacks & Namkeen" },
    { name: "Pulse Candy ₹1", brand: "DS Group", category: "Snacks & Namkeen" },
    { name: "Pulse Candy Pack", brand: "DS Group", category: "Snacks & Namkeen" },
    { name: "Alpenliebe Small Pack", brand: "Perfetti", category: "Snacks & Namkeen" },
    { name: "Melody Pack", brand: "Parle", category: "Snacks & Namkeen" },
    { name: "Eclairs Pack", brand: "Cadbury", category: "Snacks & Namkeen" },
    { name: "Mentos Roll", brand: "Perfetti", category: "Snacks & Namkeen" },
    { name: "Center Fresh Strip", brand: "Perfetti", category: "Snacks & Namkeen" },
    { name: "Happydent Pack", brand: "Perfetti", category: "Snacks & Namkeen" },
    { name: "Orbit Gum Pack", brand: "Wrigley", category: "Snacks & Namkeen" },
    { name: "Boomer Gum", brand: "Wrigley", category: "Snacks & Namkeen" },

    // Cakes & Rusk
    { name: "Lotte Choco Pie", brand: "Lotte", category: "Snacks & Namkeen" },
    { name: "Britannia Cake Roll Small", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Cake Roll Large", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Monginis Cake Pack", brand: "Monginis", category: "Snacks & Namkeen" },
    { name: "Britannia Rusk Small", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Britannia Rusk Family", brand: "Britannia", category: "Snacks & Namkeen" },
    { name: "Modern Rusk", brand: "Modern", category: "Snacks & Namkeen" },
    { name: "Elite Rusk", brand: "Elite", category: "Snacks & Namkeen" },
    { name: "Priyagold Biscuits", brand: "Priyagold", category: "Snacks & Namkeen" },
    { name: "Dukes Cream Wafers", brand: "Dukes", category: "Snacks & Namkeen" },
    { name: "Garden Cream Wafers", brand: "Garden", category: "Snacks & Namkeen" }
];

async function searchOFF(name) {
    return new Promise((resolve) => {
        // Try searching with the specific name
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1`;
        https.get(url, { headers: { 'User-Agent': 'PASR-App/1.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.products && json.products.length > 0) {
                        const product = json.products.find(p => p.image_url) || json.products[0];
                        resolve(product.image_url || null);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log("Connected to DB...");

        for (const p of productsToUpload) {
            console.log(`Processing: ${p.name}...`);

            // Check if already exists
            const existingMP = await MasterProduct.findOne({ name: p.name });
            if (existingMP && existingMP.img && existingMP.img.url) {
                console.log(`Skipped (already exists): ${p.name}`);
                continue;
            }

            // Search OFF
            let imageUrl = await searchOFF(p.name);

            // Fallback for pack sizes (search by brand + base name)
            if (!imageUrl && p.name.includes('₹')) {
                const baseName = p.name.split('₹')[0].trim();
                console.log(`Trying fallback for: ${baseName}...`);
                imageUrl = await searchOFF(baseName);
            }
            if (!imageUrl && p.name.toLowerCase().includes('pack')) {
                const baseName = p.name.split(/pack/i)[0].trim();
                console.log(`Trying fallback for: ${baseName}...`);
                imageUrl = await searchOFF(baseName);
            }

            if (!imageUrl) {
                console.log(`❌ Image not found for: ${p.name}`);
                continue;
            }

            console.log(`✅ Found image: ${imageUrl}`);

            // Upload to Cloudinary
            try {
                const uploadRes = await cloudinary.uploader.upload(imageUrl, {
                    folder: "master_catalog",
                    transformation: [
                        { width: 800, height: 800, crop: "limit", quality: "auto" },
                    ],
                });

                const mpData = {
                    name: p.name,
                    brand: p.brand,
                    category: p.category,
                    description: `Premium quality ${p.name}`,
                    img: {
                        url: uploadRes.secure_url,
                        filename: uploadRes.public_id
                    },
                    isActive: true
                };

                if (existingMP) {
                    existingMP.img = mpData.img;
                    existingMP.category = mpData.category;
                    existingMP.brand = mpData.brand;
                    await existingMP.save();
                    console.log(`✔️ Updated MasterProduct: ${p.name}`);
                } else {
                    await MasterProduct.create(mpData);
                    console.log(`✔️ Created MasterProduct: ${p.name}`);
                }

                const canonical = normalizeItemName(p.name);
                await ItemImageRegistry.findOneAndUpdate(
                    { canonicalName: canonical, displayName: p.name },
                    {
                        canonicalName: canonical,
                        displayName: p.name,
                        description: `High quality ${p.name}`,
                        imageUrl: uploadRes.secure_url,
                        publicId: uploadRes.public_id,
                        itemCategory: p.category,
                        locked: true
                    },
                    { upsert: true, new: true }
                );
                console.log(`✔️ Synced to Registry: ${p.name}`);

            } catch (err) {
                console.error(`❌ Cloudinary upload failed for ${p.name}:`, err.message);
            }

            await delay(150); // Slightly longer delay for larger batch
        }

        console.log("Batch 2 completed!");
        process.exit(0);
    } catch (err) {
        console.error("Script failed:", err);
        process.exit(1);
    }
}

run();
