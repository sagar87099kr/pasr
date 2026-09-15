const { FUEL_COST_PER_KM_ONE_WAY, RATE_PER_KM = 5, MAX_DELIVERY_DISTANCE = 100 } = require('../config/deliveryPricingConfig');

/**
 * Calculates delivery pricing breakdown at flat ₹5 per km from the Bazaar hub.
 * Distance is rounded up to the nearest whole integer.
 * 
 * @param {number} distanceKm - The distance in kilometers between the shop/bazaar hub and customer.
 * @returns {object} The pricing breakdown including customer charge, pasr commission, partner earning, and estimated fuel cost.
 */
function calculateDeliveryPricing(distanceKm, selectedCharge = null) {
    // 1. Validate inputs
    if (typeof distanceKm !== 'number' || isNaN(distanceKm) || distanceKm < 0) {
        throw new Error("Invalid distance provided.");
    }

    // Treat 0 distance (same location or very close) as 0.1 km minimum
    if (distanceKm === 0) distanceKm = 0.1;

    // 2. Auto-round distance up (e.g. 1.2 -> 2 km, minimum 1 km)
    const roundedDistance = Math.max(1, Math.ceil(distanceKm));

    // 3. Flat ₹5 per km from bazaar
    const standardCharge = roundedDistance * RATE_PER_KM;
    const customerChargeOptions = [standardCharge];

    let customerCharge = standardCharge;
    if (selectedCharge !== null && Number(selectedCharge) >= standardCharge) {
        customerCharge = Number(selectedCharge);
    }

    // PASR Commission: ₹2 for 1km, ₹3 for 2km, flat ₹5 for >=3km
    const pasrCommission = roundedDistance <= 1 ? 2 : (roundedDistance <= 2 ? 3 : 5);

    // Partner Earnings calculation
    const partnerEarning = customerCharge - pasrCommission;

    // Estimated Fuel Cost Calculation = (Distance x 2 (Round Trip)) x (Cost Per Km)
    const estimatedFuelCost = roundedDistance * 2 * FUEL_COST_PER_KM_ONE_WAY;

    // Partner Profit
    const partnerProfit = partnerEarning - estimatedFuelCost;

    // Dynamic Free delivery threshold
    const freeDeliveryThreshold = Math.max(150, 150 + (roundedDistance - 1) * 50);

    return {
        distance: roundedDistance,        // The rounded distance used for calculation
        rawDistance: Number(distanceKm.toFixed(2)), // Original precise distance
        customerChargeOptions,            // Array of selectable delivery charges
        customerCharge,                   // The effective customer charge used
        freeDeliveryThreshold,            // Threshold for free delivery
        pasrCommission,
        partnerEarning,
        estimatedFuelCost,
        partnerProfit
    };
}

module.exports = {
    calculateDeliveryPricing
};
