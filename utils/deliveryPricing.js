const { PRICING_TIERS, FUEL_COST_PER_KM_ONE_WAY, MAX_DELIVERY_DISTANCE } = require('../config/deliveryPricingConfig');

/**
 * Calculates the delivery pricing breakdown based on distance in kilometers.
 * Distance is auto-rounded up to the nearest whole integer.
 * Maximum allowed distance is 5 km.
 * 
 * @param {number} distanceKm - The distance in kilometers between the shop and customer.
 * @returns {object} The pricing breakdown including customer charge, pasr commission, partner earning, and estimated fuel cost.
 * @throws {Error} If distance exceeds the maximum allowed distance.
 */
function calculateDeliveryPricing(distanceKm) {
    // 1. Validate inputs
    if (typeof distanceKm !== 'number' || isNaN(distanceKm) || distanceKm <= 0) {
        throw new Error("Invalid distance provided.");
    }

    if (distanceKm > MAX_DELIVERY_DISTANCE) {
        throw new Error(`Delivery not available beyond ${MAX_DELIVERY_DISTANCE} km.`);
    }

    // 2. Auto-round distance up (1.1 -> 2)
    const roundedDistance = Math.ceil(distanceKm);

    // 3. Find matching pricing tier
    const tier = PRICING_TIERS.find(t => t.maxDistance === roundedDistance);

    // Fallback if somehow not found in array (should not happen due to validation)
    if (!tier) {
        throw new Error("Pricing tier not configured for the given distance.");
    }

    // 4. Calculate components
    const customerCharge = tier.customerCharge;
    const pasrCommission = tier.pasrCommission;

    // Partner Earnings calculation
    const partnerEarning = customerCharge - pasrCommission;

    // Estimated Fuel Cost Calculation = (Distance x 2 (Round Trip)) x (Cost Per Km)
    // Using rounded distance for fairness and predictable values as per rules.
    const estimatedFuelCost = roundedDistance * 2 * FUEL_COST_PER_KM_ONE_WAY;

    // Partner Profit
    const partnerProfit = partnerEarning - estimatedFuelCost;

    return {
        distance: roundedDistance,        // The rounded distance used for calculation
        rawDistance: Number(distanceKm.toFixed(2)), // Original precise distance
        customerCharge,
        pasrCommission,
        partnerEarning,
        estimatedFuelCost,
        partnerProfit
    };
}

module.exports = {
    calculateDeliveryPricing
};
