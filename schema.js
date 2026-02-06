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
    }).required()
});

module.exports.itemSchema = Joi.object({
    item: Joi.object({
        name: Joi.string().required(),
        price: Joi.number().required().min(0),
        quantity: Joi.number().required().min(0),
    }).required()
});