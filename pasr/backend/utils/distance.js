// Uses Google Maps Distance Matrix API if requested, falls back to Haversine if it fails or useGoogle=false
module.exports.calculateDistance = async (lat1, lon1, lat2, lon2, useGoogle = false) => {
    if (useGoogle) {
        try {
            const apiKey = process.env.GOOGLE_MAP_API_KEY;
            if (!apiKey) throw new Error("Google Maps API Key completely missing");

            const origins = `${lat1},${lon1}`;
            const destinations = `${lat2},${lon2}`;
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}`;

            // Node.js 18+ global fetch
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
                // value is in meters, convert to km
                const distanceInMeters = data.rows[0].elements[0].distance.value;
                return Number((distanceInMeters / 1000).toFixed(2));
            } else {
                throw new Error("Invalid response from Google Maps Matrix API");
            }
        } catch (error) {
            console.error("Google Maps API failed, falling back to Haversine displacement:", error.message);
        }
    }

    // Fallback or default Haversine formulation
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return Number(d.toFixed(2));
};

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
