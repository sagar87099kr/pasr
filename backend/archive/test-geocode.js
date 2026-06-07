const { Client } = require("@googlemaps/google-maps-services-js");
require('dotenv').config();

const client = new Client({});
async function getGeocode(lat, lng) {
  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: `${lat},${lng}`,
        key: process.env.GOOGLE_MAP_API_KEY
      }
    });
    console.log(JSON.stringify(response.data.results[0].address_components, null, 2));
  } catch (e) {
    console.error(e);
  }
}
// Using some random coordinates from India
getGeocode(28.6139, 77.2090);
