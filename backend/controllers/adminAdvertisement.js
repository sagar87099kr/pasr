const Advertisement = require("../data/advertisement");
const { cloudinary } = require("../cloud_con");

// Helper to extract Cloudinary public ID
function getCloudinaryPublicId(ad) {
    if (ad.imageId && typeof ad.imageId === 'string' && ad.imageId.trim().length > 0) {
        return ad.imageId.trim();
    }
    if (ad.imageUrl && ad.imageUrl.includes('/upload/')) {
        const afterUpload = ad.imageUrl.split('/upload/')[1];
        const withoutVersion = afterUpload.replace(/^v\d+\//, '');
        const publicId = withoutVersion.replace(/\.[^/.]+$/, '');
        return publicId;
    }
    return null;
}

module.exports.getAdvertisements = async (req, res) => {
    try {
        const advertisements = await Advertisement.find({}).sort({ createdAt: -1 });
        res.render("pages/adminAdvertisements.ejs", { advertisements });
    } catch (error) {
        req.flash("error", "Error loading advertisements");
        res.redirect("/admin/dashboard");
    }
};

module.exports.createAdvertisement = async (req, res) => {
    try {
        if (!req.file) {
            req.flash("error", "Image file is required");
            return res.redirect("/admin/advertisements");
        }

        const { title, link, phoneNumber, startTime, endTime } = req.body;
        
        let start = new Date();
        if (startTime && !isNaN(new Date(startTime).getTime())) {
            start = new Date(startTime);
        }

        let end = null;
        if (endTime && !isNaN(new Date(endTime).getTime())) {
            end = new Date(endTime);
        }

        const ad = new Advertisement({
            title: title || 'Special Offer',
            imageUrl: req.file.path,
            imageId: req.file.filename,
            link: link || "",
            phoneNumber: phoneNumber || "",
            startTime: start,
            endTime: end,
            isActive: true
        });

        await ad.save();
        req.flash("success", "Advertisement created successfully");
        res.redirect("/admin/advertisements");
    } catch (error) {
        console.error('Error creating advertisement:', error);
        req.flash("error", "Failed to create advertisement");
        res.redirect("/admin/advertisements");
    }
};

module.exports.deleteAdvertisement = async (req, res) => {
    try {
        const ad = await Advertisement.findById(req.params.id);
        if (ad) {
            const publicId = getCloudinaryPublicId(ad);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
                } catch (cErr) {
                    console.error('Error deleting from Cloudinary:', cErr);
                }
            }
            await Advertisement.findByIdAndDelete(req.params.id);
            req.flash("success", "Advertisement and image deleted successfully");
        } else {
            req.flash("error", "Advertisement not found");
        }
        res.redirect("/admin/advertisements");
    } catch (error) {
        console.error('Error deleting advertisement:', error);
        req.flash("error", "Failed to delete advertisement");
        res.redirect("/admin/advertisements");
    }
};

module.exports.toggleActive = async (req, res) => {
    try {
        const ad = await Advertisement.findById(req.params.id);
        if (ad) {
            ad.isActive = !ad.isActive;
            await ad.save();
            req.flash("success", `Advertisement ${ad.isActive ? 'activated' : 'deactivated'}`);
        } else {
            req.flash("error", "Advertisement not found");
        }
        res.redirect("/admin/advertisements");
    } catch (error) {
        req.flash("error", "Failed to update advertisement");
        res.redirect("/admin/advertisements");
    }
};

