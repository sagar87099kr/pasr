// mapToken is already defined in the global scope by profile.ejs
console.log("Map script running...");
console.log("Map Token:", mapToken ? "Present" : "Missing");

if (!mapToken) {
    console.error("Map token is undefined or empty.");
}

if (typeof mapboxgl === 'undefined') {
    console.error("Mapbox GL JS is not loaded. Check script include.");
} else {
    mapboxgl.accessToken = mapToken;
    try {
        const map = new mapboxgl.Map({
            container: 'map', // container ID
            style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
            center: allData.geometry.coordinates, // starting position [lng, lat]
            zoom: 13 // starting zoom
        });

        // Add zoom and rotation controls to the map.
        map.addControl(new mapboxgl.NavigationControl());

        // Change cursor on hover
        map.on('mouseenter', () => map.getCanvas().style.cursor = 'move');
        map.on('mouseleave', () => map.getCanvas().style.cursor = '');

        const Marker = new mapboxgl.Marker({ color: 'red' })
            .setLngLat(allData.geometry.coordinates)
            .setPopup(
                new mapboxgl.Popup({ offset: 45 })
                    .setHTML(`<h4>${allData.company}</h4><p>${allData.location}</p>`)
                    .setMaxWidth("300px")
            )
            .addTo(map);

        console.log("Map initialized successfully.");
    } catch (err) {
        console.error("Error initializing map:", err);
    }
}
