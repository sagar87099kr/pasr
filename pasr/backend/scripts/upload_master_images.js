const mongoose = require("mongoose");
const MasterProduct = require("../data/masterProduct");
const ItemImageRegistry = require("../data/itemImageRegistry");
const { normalizeItemName } = require("../utils/normalization");
const { cloudinary } = require("../cloud_con");
const https = require("https");
require('dotenv').config();

const productsToUpload = [
    { name: "India Gate Basmati Rice", brand: "India Gate", category: "Staples & Grains" },
    { name: "Daawat Basmati Rice", brand: "Daawat", category: "Staples & Grains" },
    { name: "Fortune Basmati Rice", brand: "Fortune", category: "Staples & Grains" },
    { name: "Kohinoor Basmati Rice", brand: "Kohinoor", category: "Staples & Grains" },
    { name: "Lal Qilla Basmati Rice", brand: "Lal Qilla", category: "Staples & Grains" },
    { name: "Aashirvaad Atta", brand: "Aashirvaad", category: "Staples & Grains" },
    { name: "Fortune Chakki Atta", brand: "Fortune", category: "Staples & Grains" },
    { name: "Pillsbury Atta", brand: "Pillsbury", category: "Staples & Grains" },
    { name: "Patanjali Atta", brand: "Patanjali", category: "Staples & Grains" },
    { name: "Annapurna Atta", brand: "Annapurna", category: "Staples & Grains" },
    { name: "Rajdhani Besan", brand: "Rajdhani", category: "Staples & Grains" },
    { name: "Fortune Besan", brand: "Fortune", category: "Staples & Grains" },
    { name: "Rajdhani Suji", brand: "Rajdhani", category: "Staples & Grains" },
    { name: "Aashirvaad Maida", brand: "Aashirvaad", category: "Staples & Grains" },
    { name: "Kellogg’s Oats", brand: "Kellogg’s", category: "Breakfast & Cereals" },
    { name: "Saffola Oats", brand: "Saffola", category: "Breakfast & Cereals" },
    { name: "Quaker Oats", brand: "Quaker", category: "Breakfast & Cereals" },
    { name: "Saffola Masala Oats", brand: "Saffola", category: "Breakfast & Cereals" },
    { name: "Tata Sampann Dal Arhar", brand: "Tata Sampann", category: "Pulses & Dals" },
    { name: "Tata Sampann Moong Dal", brand: "Tata Sampann", category: "Pulses & Dals" },
    { name: "Tata Sampann Masoor Dal", brand: "Tata Sampann", category: "Pulses & Dals" },
    { name: "Tata Sampann Chana Dal", brand: "Tata Sampann", category: "Pulses & Dals" },
    { name: "Rajdhani Toor Dal", brand: "Rajdhani", category: "Pulses & Dals" },
    { name: "Rajdhani Chana Dal", brand: "Rajdhani", category: "Pulses & Dals" },
    { name: "Fortune Toor Dal", brand: "Fortune", category: "Pulses & Dals" },
    { name: "24 Mantra Organic Dal", brand: "24 Mantra Organic", category: "Pulses & Dals" },
    { name: "Tata Sampann Rajma", brand: "Tata Sampann", category: "Pulses & Dals" },
    { name: "Rajdhani Rajma", brand: "Rajdhani", category: "Pulses & Dals" },
    { name: "Fortune Kabuli Chana", brand: "Fortune", category: "Pulses & Dals" },
    { name: "Tata Sampann Kabuli Chana", brand: "Tata Sampann", category: "Pulses & Dals" },
    { name: "MTR Vermicelli", brand: "MTR", category: "Staples & Grains" },
    { name: "Bambino Vermicelli", brand: "Bambino", category: "Staples & Grains" },
    { name: "Gits Dalia", brand: "Gits", category: "Staples & Grains" },
    { name: "Tata Sampann Poha", brand: "Tata Sampann", category: "Staples & Grains" },
    { name: "Kellogg’s Cornflakes", brand: "Kellogg’s", category: "Breakfast & Cereals" },
    { name: "Bagrry’s Muesli", brand: "Bagrry’s", category: "Breakfast & Cereals" },
    { name: "Yoga Bar Muesli", brand: "Yoga Bar", category: "Breakfast & Cereals" },
    { name: "Saffola Multigrain Atta", brand: "Saffola", category: "Staples & Grains" },
    { name: "Natureland Organic Atta", brand: "Natureland Organic", category: "Staples & Grains" },
    { name: "Organic Tattva Rice", brand: "Organic Tattva", category: "Staples & Grains" }
];

async function searchOFF(name) {
    return new Promise((resolve) => {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1`;
        https.get(url, { headers: { 'User-Agent': 'PASR-App/1.0' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.products && json.products.length > 0) {
                        // Look for a product with an image_url
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

            // 1. Check if already exists in MasterProduct with an image
            const existingMP = await MasterProduct.findOne({ name: p.name });
            if (existingMP && existingMP.img && existingMP.img.url) {
                console.log(`Skipped (already exists): ${p.name}`);
                continue;
            }

            // 2. Search Open Food Facts
            const imageUrl = await searchOFF(p.name);
            if (!imageUrl) {
                console.log(`❌ Image not found on Open Food Facts for: ${p.name}`);
                continue;
            }

            console.log(`✅ Found image: ${imageUrl}`);

            // 3. Upload to Cloudinary
            try {
                // Cloudinary can upload from a URL directly
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

                // 4. Create or Update MasterProduct
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

                // 5. Sync to ItemImageRegistry
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

            // Small delay to be polite to APIs
            await delay(100);
        }

        console.log("All tasks completed!");
        process.exit(0);
    } catch (err) {
        console.error("Script failed:", err);
        process.exit(1);
    }
}

run();
