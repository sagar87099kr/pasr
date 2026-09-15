/**
 * PASR Delivery Pricing Configuration
 * Centralized settings for calculating delivery distance, customer charges, and PASR commissions.
 */

// Delivery pricing tiers based on distance (km)
const PRICING_TIERS = [
    { maxDistance: 1, customerChargeOptions: [5], pasrCommission: 2, freeDeliveryThreshold: 150 },
    { maxDistance: 2, customerChargeOptions: [10], pasrCommission: 3, freeDeliveryThreshold: 200 },
    { maxDistance: 3, customerChargeOptions: [15], pasrCommission: 4, freeDeliveryThreshold: 250 },
    { maxDistance: 4, customerChargeOptions: [20], pasrCommission: 5, freeDeliveryThreshold: 300 },
    { maxDistance: 5, customerChargeOptions: [25], pasrCommission: 5, freeDeliveryThreshold: 350 }
];

// Flat assumption for partner fuel cost per km (for a one-way trip).
// Given petrol is ~₹5/km average, one way is ₹2.5/km.
const FUEL_COST_PER_KM_ONE_WAY = 2.5; // ₹2.5/km

// Rate charged per km from the Bazaar hub
const RATE_PER_KM = 5; // ₹5 per km

// Absolute maximum distance supported by the platform (open/large)
const MAX_DELIVERY_DISTANCE = 100; // km

module.exports = {
    FUEL_COST_PER_KM_ONE_WAY,
    RATE_PER_KM,
    MAX_DELIVERY_DISTANCE
};
