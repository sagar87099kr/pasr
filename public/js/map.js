const debugEl = document.getElementById("map-debug");
function showMapError(msg) {
    if (debugEl) {
        debugEl.style.display = "block";
        debugEl.innerHTML += `<div><strong>Map Error:</strong> ${msg}</div>`;
    }
    console.error("Map Error:", msg);
}

// mapToken is already defined in the global scope by profile.ejs
console.log("Map script running...");

if (!mapToken) {
    showMapError("Map Token is missing. Please check .env file.");
} else if (typeof mapboxgl === 'undefined') {
    showMapError("Mapbox Library not loaded. Check internet connection or adblocker.");
} else if (!allData || !allData.geometry || !allData.geometry.coordinates) {
    showMapError("Location coordinates invalid or missing.");
} else {
    mapboxgl.accessToken = mapToken;
    try {
        const map = new mapboxgl.Map({
            container: 'map', // container ID
            style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
            center: allData.geometry.coordinates, // starting position [lng, lat]
            zoom: 13 // starting zoom
        });

        // HACK: Trigger resize repeatedly for a few seconds to handle flex layout shifts
        const resizeMap = () => map.resize();
        map.on('load', resizeMap);
        setTimeout(resizeMap, 500);
        setTimeout(resizeMap, 1000);
        setTimeout(resizeMap, 2000);

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

        // Catch Mapbox-specific errors
        map.on('error', (e) => {
            showMapError(`Mapbox Error: ${e.error ? e.error.message : e}`);
        });

    } catch (err) {
        showMapError(`Initialization Failed: ${err.message}`);
    }
}
