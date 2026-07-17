const Joi = require('joi');

const updateAddressSchema = Joi.object({
    address: Joi.string().min(5).max(300).required(),
    lat: Joi.number().optional().allow(null, ""),
    lng: Joi.number().optional().allow(null, ""),
    pincode: Joi.number().optional().allow(null, "")
});

const payload = {
    address: "Gandhi chowk, near ambesri baba mandir, Rajdhanwar, Jharkhand 825412, India",
    lat: "24.4124",
    lng: "85.9863",
    pincode: "825412"
};

const { error } = updateAddressSchema.validate(payload);
if (error) {
    console.error("Validation error:", error.details[0].message);
} else {
    console.log("Validation passed!");
}
