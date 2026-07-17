/**
 * PASR Delivery Pricing Configuration
 * Centralized settings for calculating delivery distance, customer charges, and PASR commissions.
 */

// Delivery pricing tiers based on distance (km)
const PRICING_TIERS = [
    { maxDistance: 1, customerCharge: 14, pasrCommission: 2 },
    { maxDistance: 2, customerCharge: 20, pasrCommission: 3 },
    { maxDistance: 3, customerCharge: 29, pasrCommission: 4 },
    { maxDistance: 4, customerCharge: 35, pasrCommission: 5 },
    { maxDistance: 5, customerCharge: 40, pasrCommission: 5 }
];

// Flat assumption for partner fuel cost per km (for a one-way trip).
// Note: Final cost is usually multiplied by 2 to account for round-trip.
// Given petrol is ~₹5/km average, one way is ₹2.5/km.
const FUEL_COST_PER_KM_ONE_WAY = 2.5; // ₹2.5/km

// Absolute maximum distance supported by the platform
const MAX_DELIVERY_DISTANCE = 5; // km

module.exports = {
    PRICING_TIERS,
    FUEL_COST_PER_KM_ONE_WAY,
    MAX_DELIVERY_DISTANCE
};
