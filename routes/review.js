const express = require("express");
const router = express.Router({ mergeParams: true });
const Review = require("../data/review.js");
const Provider = require("../data/serviceproviders.js");
const { isLogedin, isVerifiedCustomer, validatereview, isReviewAuthor } = require("../middeleware.js");
const wrapAsync = require("../utils/wrapAsync.js");

// reviews data
router.post("/:id/reviews",
    isLogedin,
    isVerifiedCustomer,
    validatereview,
    wrapAsync(async (req, res) => {
        let { id } = req.params;
        let provider = await Provider.findById(id);
        let newReview = new Review(req.body.review);
        newReview.author = req.user._id;
        console.log(newReview);
        provider.review.push(newReview);
        await newReview.save();
        await provider.save();
        console.log("new review was saved");
        req.flash("success", "New review is created");
        res.redirect(`/provider/${id}/profile`);
    }));

// delete reviews
router.delete("/provider/:id/review/:reviewId", isLogedin,
    isReviewAuthor,
    wrapAsync(async (req, res) => {
        let { id, reviewId } = req.params;
        await Provider.findByIdAndUpdate(id, { $pull: { review: reviewId } });
        await Review.findByIdAndDelete(reviewId);
        req.flash("danger", "You have delete this review");
        res.redirect(`/provider/${id}/profile`);
    }));

module.exports = router;
