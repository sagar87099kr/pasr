const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });
const Shop = require("../data/shops.js");
const Bazaar = require("../data/bazaar.js");

const targetBazaars = ["balhara", "doranda", "khorimahuwa", "jamua", "kodambari"];

async function seedBazaars() {
    try {
        await mongoose.connect(process.env.ATLAS_DB_URL);
        console.log("Connected to MongoDB.");

        for (const bazaarName of targetBazaars) {
            // Find shops that mention this bazaar in their location, case-insensitive
            const shops = await Shop.find({ location: { $regex: bazaarName, $options: "i" } });
            
            if (shops.length > 0) {
                // Calculate average coordinates
                let sumLat = 0;
                let sumLng = 0;
                let validCount = 0;

                for (const shop of shops) {
                    if (shop.geometry && shop.geometry.coordinates && shop.geometry.coordinates.length === 2) {
                        sumLng += shop.geometry.coordinates[0];
                        sumLat += shop.geometry.coordinates[1];
                        validCount++;
                    }
                }

                if (validCount > 0) {
                    const avgLng = sumLng / validCount;
                    const avgLat = sumLat / validCount;

                    // Check if bazaar already exists
                    let bazaar = await Bazaar.findOne({ name: { $regex: new RegExp(`^${bazaarName}$`, "i") } });
                    
                    if (!bazaar) {
                        bazaar = new Bazaar({
                            name: bazaarName.charAt(0).toUpperCase() + bazaarName.slice(1),
                            location: `${bazaarName}, Jharkhand`,
                            geometry: {
                                type: "Point",
                                coordinates: [avgLng, avgLat]
                            },
                            radius: 5000 // 5km
                        });
                        await bazaar.save();
                        console.log(`Created Bazaar: ${bazaar.name} at [${avgLng}, ${avgLat}] from ${validCount} shops.`);
                    } else {
                        console.log(`Bazaar already exists: ${bazaar.name}`);
                    }
                } else {
                    console.log(`No valid GPS coordinates found for shops in ${bazaarName}`);
                }
            } else {
                console.log(`No shops found for ${bazaarName}`);
            }
        }

    } catch (e) {
        console.error("Error seeding bazaars:", e);
    } finally {
        mongoose.disconnect();
    }
}

seedBazaars();
