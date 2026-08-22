const Advertisement = require("../data/advertisement");
const cloudinary = require("../cloud_con").uploader;

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
        
        const ad = new Advertisement({
            title,
            imageUrl: req.file.path,
            imageId: req.file.filename,
            link: link || "",
            phoneNumber: phoneNumber || "",
            startTime: new Date(startTime),
            endTime: new Date(endTime),
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
            if (ad.imageId) {
                await cloudinary.destroy(ad.imageId).catch(e => console.log(e));
            }
            await Advertisement.findByIdAndDelete(req.params.id);
            req.flash("success", "Advertisement deleted successfully");
        } else {
            req.flash("error", "Advertisement not found");
        }
        res.redirect("/admin/advertisements");
    } catch (error) {
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
