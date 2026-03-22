/**
 * PASR Delivery Pricing Configuration
 * Centralized settings for calculating delivery distance, customer charges, and PASR commissions.
 */

// Delivery pricing tiers based on distance (km)
const PRICING_TIERS = [
    { maxDistance: 1, customerCharge: 10, pasrCommission: 0 },
    { maxDistance: 2, customerCharge: 15, pasrCommission: 1 },
    { maxDistance: 3, customerCharge: 22, pasrCommission: 2 },
    { maxDistance: 4, customerCharge: 28, pasrCommission: 3 },
    { maxDistance: 5, customerCharge: 35, pasrCommission: 4 },
    { maxDistance: 6, customerCharge: 45, pasrCommission: 5 },
    { maxDistance: 7, customerCharge: 55, pasrCommission: 6 },
    { maxDistance: 8, customerCharge: 65, pasrCommission: 8 },
    { maxDistance: 9, customerCharge: 80, pasrCommission: 10 },
    { maxDistance: 10, customerCharge: 95, pasrCommission: 12 }
];

// Flat assumption for partner fuel cost per km (for a one-way trip).
// Note: Final cost is usually multiplied by 2 to account for round-trip.
const FUEL_COST_PER_KM_ONE_WAY = 2; // ₹2/km

// Absolute maximum distance supported by the platform
const MAX_DELIVERY_DISTANCE = 10; // km

module.exports = {
    PRICING_TIERS,
    FUEL_COST_PER_KM_ONE_WAY,
    MAX_DELIVERY_DISTANCE
};
