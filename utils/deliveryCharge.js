module.exports.calculateDeliveryCharge = (distanceInKm) => {
    if (distanceInKm <= 1) return 10;
    if (distanceInKm > 1 && distanceInKm <= 2) return 15;
    if (distanceInKm > 2 && distanceInKm <= 3) return 20;
    if (distanceInKm > 3 && distanceInKm <= 4) return 25;
    if (distanceInKm > 4 && distanceInKm <= 5) return 30;
    throw new Error("Delivery location is out of service area (max 5km).");
};
