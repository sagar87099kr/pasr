const debugEl = document.getElementById("map-debug");

function showMapError(msg) {
    const mapEl = document.getElementById("map");
    if (mapEl) {
        mapEl.style.background = "#fee2e2";
        mapEl.style.color = "#b91c1c";
        mapEl.style.display = "flex";
        mapEl.style.alignItems = "center";
        mapEl.style.justifyContent = "center";
        mapEl.style.padding = "20px";
        mapEl.style.textAlign = "center";
        let debugInfo = "allData type: " + typeof window.allData;
        try {
            if (window.allData) debugInfo += "<br>Value keys: " + Object.keys(window.allData).join(", ");
        } catch (e) { debugInfo += "<br>Error reading keys"; }

        mapEl.innerHTML = `<div><strong>Map Unavailable</strong><br>${msg}<br><br><small style="color:#7f1d1d; font-family:monospace;">DEBUG: ${debugInfo}</small></div>`;
    }
    console.error("Map Error:", msg);
}

// Check if Google Maps API is loaded
// Check if Google Maps API is loaded
function initMap() {
    console.log("Map script running...");

    // 1. Get the map container
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
        console.warn("Map container not found on this page.");
        return;
    }

    // 2. Parse data from data-attribute
    let allData = null;
    try {
        const rawData = mapContainer.getAttribute("data-location");
        if (rawData) {
            allData = JSON.parse(rawData);
        } else if (window.allData) {
            // Fallback to window object if data attribute is missing but global exists
            allData = window.allData;
        }
    } catch (e) {
        showMapError("Failed to parse location data: " + e.message);
        return;
    }

    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        // Wait a bit if it's just slow to load
        setTimeout(() => {
            if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
                showMapError("Google Maps Library failed to load.");
            } else {
                initMap();
            }
        }, 1000);
        return;
    }

    if (!allData) {
        showMapError("Location data invalid or missing from element.");
        return;
    }

    if (!allData.geometry || !allData.geometry.coordinates) {
        showMapError("Location coordinates not found for this profile.");
        return;
    }

    try {
        // Mongo stores as [lng, lat], Google wants {lat, lng}
        const location = {
            lat: allData.geometry.coordinates[1],
            lng: allData.geometry.coordinates[0]
        };

        const map = new google.maps.Map(mapContainer, {
            zoom: 13,
            center: location,
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px; max-width: 200px;">
                    <h4 style="margin: 0 0 5px 0;">${allData.company || allData.shopName || "Location"}</h4>
                    <p style="margin: 0;">${allData.location}</p>
                </div>
            `
        });

        const marker = new google.maps.Marker({
            position: location,
            map: map,
            title: allData.company || allData.shopName
        });

        marker.addListener("click", () => {
            infoWindow.open({
                anchor: marker,
                map,
                shouldFocus: false,
            });
        });

        console.log("Map initialized successfully.");

    } catch (err) {
        showMapError(`Initialization Failed: ${err.message}`);
    }
}

// Google Maps callback
window.initMap = initMap;

// Fallback init if callback doesn't fire (e.g. if script loaded synchronously)
if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
    initMap();
}
