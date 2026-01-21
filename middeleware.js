const Provider = require("./data/serviceproviders.js");
const {providerSchema, customerSchema, reviewSchema} = require("./schema.js");
const ExpressError = require("./utils/expressError.js");
const Review = require("./data/review.js");
const Customer = require("./data/customers.js");

module.exports.isLogedin = (req, res , next) =>{
    if (!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
        req.flash("danger", "You must be login to see all services.");
        return res.redirect("/alreadyLogin");
    }
    next();
}

module.exports.saveRedirectUrl = (req, res, next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner = async(req, res, next) =>{
    let {id} = req.params;
    console.log(id);
    let provider = await Provider.findById(id);
    if (res.locals.currUser && !provider.owner._id.equals(res.locals.currUser._id)){
        req.flash("danger", "You are not the Owner.");
        return res.redirect(`/provider/${id}/profile`);
    }
    next();
}

module.exports.isVerifiedCustomer = async (req, res, next) => {
  try {
    // IMPORTANT: choose the correct id source:
    // - If your route is like /customer/:id/... use req.params.id
    // - If you're checking logged-in customer, use req.user._id (recommended)

    const customerId = req.user?._id; // recommended for logged-in user
    // const customerId = req.params.id; // if you really want param-based

    if (!customerId) {
      req.flash("danger", "Please login first.");
      return res.redirect("/login");
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      req.flash("danger", "Customer not found.");
      return res.redirect("/home");
    }

    if (customer.verified !== true) {
      req.flash("danger", "You are not verified yet.");
      return  res.redirect("/home");
    }

    // optional: keep it available for next handlers
    res.locals.currentCustomer = customer;

    next();
  } catch (err) {
    next(err);
  }
};
module.exports.isadmin = async(req,res,next)=>{
    let customer = await Customer.find();
    if (res.locals.currUser.username!==8709956547 && customer.username !== 8709956547){
        req.flash("danger", "Only admin have access of this route");
        return res.redirect(`/home`);
    }
    next();
}
module.exports.validateprovider = (req,res,next)=>{
    let {error} = providerSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError (400, errMsg)
    }else{
        next()
    }

}
module.exports.validatecustomer = (req,res,next)=>{
    let {error} = customerSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError (400, errMsg)
    }else{
        next();
    }

}
module.exports.validatereview = (req,res,next)=>{
    let {error} = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError (400, errMsg)
    }else{
        next();
    }
}

module.exports.isReviewAuthor = async(req, res, next) =>{
    let{id,reviewId}=req.params;
    let review = await Review.findById(reviewId);
    if (res.locals.currUser && !review.author.equals(res.locals.currUser._id)){
        req.flash("danger", "Only review owner can delete this review.");
        return res.redirect(`/provider/${id}/profile`);
    }
    next();
}
