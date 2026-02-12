const Joi = require('joi');
const review = require('./data/review');

module.exports.providerSchema = Joi.object({
    provider: Joi.object({
        categories: Joi.string().required(),
        discription: Joi.string().allow(""),
        experience: Joi.number().allow(""),
        company: Joi.string().allow(""),
        location: Joi.string().required(),
    })
});

module.exports.customerSchema = Joi.object({
    customer: Joi.object({
        name: Joi.string().required().max(100).min(3),
        username: Joi.number().required().min(10),
        password: Joi.string().required(),
        confirm: Joi.ref("password"),
        address: Joi.string().required(),
    })
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        ratings: Joi.number().required().max(5).min(1).required(),
        comment: Joi.string().max(300).min(3).required(),
    })
});

module.exports.shopSchema = Joi.object({
    shop: Joi.object({
        shopName: Joi.string().required(),
        category: Joi.string().required(),
        location: Joi.string().required(),
        shopDescription: Joi.string().allow(""),
        openingTime: Joi.string()
            .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .messages({
                'string.pattern.base': 'Opening time must be in HH:MM format (e.g., 09:00)',
                'string.empty': 'Opening time is optional but if provided must be valid'
            })
            .allow(""),
        closingTime: Joi.string()
            .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .messages({
                'string.pattern.base': 'Closing time must be in HH:MM format (e.g., 21:00)',
                'string.empty': 'Closing time is optional but if provided must be valid'
            })
            .allow("")
    }).required()
        .custom((value, helpers) => {
            // If both times are provided, validate that closing is after opening
            if (value.openingTime && value.closingTime) {
                const opening = value.openingTime.split(':').map(Number);
                const closing = value.closingTime.split(':').map(Number);

                const openingMinutes = opening[0] * 60 + opening[1];
                const closingMinutes = closing[0] * 60 + closing[1];

                if (closingMinutes <= openingMinutes) {
                    return helpers.message('Closing time must be after opening time');
                }
            }
            return value;
        }, 'time validation')
});

module.exports.itemSchema = Joi.object({
    item: Joi.object({
        name: Joi.string().required(),
        price: Joi.number().required().min(0),
        quantity: Joi.number().required().min(0),
        itemCategory: Joi.string().allow(""),
    }).required()
});