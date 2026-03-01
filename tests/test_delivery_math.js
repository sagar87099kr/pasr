const distanceUtils = require("../utils/distance");
const chargeUtils = require("../utils/deliveryCharge");
const assert = require("assert");

// Test Distance Calculation
function testDistance() {
    // Coordinates roughly 3km apart
    const lat1 = 28.7041;
    const lon1 = 77.1025;
    const lat2 = 28.7311;
    const lon2 = 77.1025;

    const dist = distanceUtils.calculateDistance(lat1, lon1, lat2, lon2);
    console.log(`Test Distance: Expected ~3.00, Got ${dist}`);
    assert(dist >= 2.9 && dist <= 3.2, "Distance calculation failed");
}

// Test Delivery Charge Calculation
function testDeliveryCharge() {
    console.log("Testing delivery charge...");

    // Test 1.5km (Should be 15)
    assert.strictEqual(chargeUtils.calculateDeliveryCharge(1.5), 15);

    // Test 3km (Should be 20)
    assert.strictEqual(chargeUtils.calculateDeliveryCharge(3), 20);

    // Test 4.5km (Should be 25)
    assert.strictEqual(chargeUtils.calculateDeliveryCharge(4.5), 25);

    // Test 6km (Should throw Error)
    assert.throws(() => {
        chargeUtils.calculateDeliveryCharge(6);
    }, Error);

    console.log("Delivery Charge tests passed.");
}

try {
    testDistance();
    testDeliveryCharge();
    console.log("✅ All mathematical tests passed.");
} catch (e) {
    console.error("❌ Test Failed:", e.message);
}
