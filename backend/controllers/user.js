const Customer = require("../data/customers");
const { forwardGeocode } = require("../utils/geocoder");

module.exports.updateAddress = async (req, res, next) => {
    try {
        const { address, lat, lng, pincode } = req.body;

        if (!address) {
            return res.status(400).json({ success: false, message: "Address is required." });
        }

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

        const updateData = { address };
        if (geometry) updateData.geometry = geometry;
        if (pincode) updateData.pincode = pincode;

        await Customer.findByIdAndUpdate(req.user._id, updateData);

        res.status(200).json({
            success: true,
            message: "Address updated successfully",
            address: address,
            geometry: geometry
        });
    } catch (e) {
        next(e);
    }
};
