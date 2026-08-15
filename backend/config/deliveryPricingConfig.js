/**
 * PASR Delivery Pricing Configuration
 * Centralized settings for calculating delivery distance, customer charges, and PASR commissions.
 */

// Delivery pricing tiers based on distance (km)
const PRICING_TIERS = [
    { maxDistance: 1, customerChargeOptions: [5], pasrCommission: 2, freeDeliveryThreshold: 140 },
    { maxDistance: 2, customerChargeOptions: [10], pasrCommission: 3, freeDeliveryThreshold: 200 },
    { maxDistance: 3, customerChargeOptions: [15], pasrCommission: 4, freeDeliveryThreshold: 250 },
    { maxDistance: 4, customerChargeOptions: [20], pasrCommission: 5, freeDeliveryThreshold: 350 },
    { maxDistance: 5, customerChargeOptions: [25], pasrCommission: 5, freeDeliveryThreshold: 450 }
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
