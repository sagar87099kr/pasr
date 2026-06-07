const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

module.exports.forwardGeocode = async (query) => {
    try {
        const response = await client.geocode({
            params: {
                address: query,
                key: process.env.GOOGLE_MAP_API_KEY,
            },
        });


        if (response.data.results.length > 0) {
            const result = response.data.results[0];
            const { lat, lng } = result.geometry.location;
            return {
                body: {
                    features: [
                        {
                            geometry: {
                                type: "Point",
                                coordinates: [lng, lat], // GeoJSON format [lng, lat]
                            },
                            place_name: result.formatted_address,
                            context: result.address_components.map(c => ({
                                id: c.types[0],
                                text: c.long_name
                            }))
                        },
                    ],
                },
            };
        }
        return { body: { features: [] } };
    } catch (e) {
        console.error("Google Geocoding Error:", e.response ? e.response.data : e.message);
        throw e;
    }
};

module.exports.reverseGeocode = async (coordinates) => {
    try {
        // coordinates is [lng, lat]
        const latlng = { lat: coordinates[1], lng: coordinates[0] };

        const response = await client.reverseGeocode({
            params: {
                latlng: latlng,
                key: process.env.GOOGLE_MAP_API_KEY,
            },
        });

        if (response.data.results.length > 0) {
            const result = response.data.results[0];
            const { lat, lng } = result.geometry.location;
            return {
                body: {
                    features: [
                        {
                            place_name: result.formatted_address,
                            geometry: {
                                type: "Point",
                                coordinates: [lng, lat]
                            },
                            context: result.address_components.map(c => ({
                                id: c.types[0],
                                text: c.long_name
                            }))
                        },
                    ],
                },
            };
        }
        return { body: { features: [] } };
    } catch (e) {
        console.error("Google Reverse Geocoding Error:", e.response ? e.response.data : e.message);
        throw e;
    }
}
