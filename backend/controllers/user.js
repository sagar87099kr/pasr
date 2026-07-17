const Customer = require("../data/customers");
const { forwardGeocode } = require("../utils/geocoder");
const { updateAddressSchema } = require("../schema");

module.exports.updateAddress = async (req, res, next) => {
    try {
        const { error } = updateAddressSchema.validate(req.body);
        if (error) {
            require('fs').appendFileSync('updateAddress_debug.log', 'Validation error: ' + error.details[0].message + '\n');
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { address, lat, lng, pincode } = req.body;

        let geometry = null;
        if (lat && lng) {
            geometry = {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)]
            };
        } else {
            // Fallback to geocoding if coordinates not provided
            try {
                const geoData = await forwardGeocode(address);
                if (geoData.body.features.length > 0) {
                    geometry = geoData.body.features[0].geometry;
                }
            } catch (e) {
                console.error("Geocoding failed during address update:", e);
            }
        }

        const customer = await Customer.findById(req.user._id);
        
        if (!customer.savedAddresses) {
            customer.savedAddresses = [];
        }

        // Save to savedAddresses if not already present
        const existing = customer.savedAddresses.find(a => a.addressStr === address);
        if (!existing) {
            customer.savedAddresses.push({
                label: 'Other',
                addressStr: address,
                geometry: geometry
            });
        }
        
        customer.address = address;
        if (geometry) customer.geometry = geometry;
        if (pincode) customer.pincode = pincode;

        await customer.save();

        require('fs').appendFileSync('updateAddress_debug.log', 'Address saved successfully for user ' + customer.username + '\n');
        res.status(200).json({
            success: true,
            message: "Address updated successfully",
            address: address,
            geometry: geometry
        });
    } catch (e) {
        require('fs').appendFileSync('updateAddress_debug.log', 'Error saving address: ' + (e.stack || e) + '\n');
        console.error(e);
        res.status(500).json({ success: false, message: "Internal server error: " + e.message });
    }
};
