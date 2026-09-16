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

// Helper to parse datetime-local inputs considering Indian Standard Time (+05:30)
function parseLocalDateTime(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) {
        return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        if (!trimmed) return null;
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
            const withOffset = `${trimmed.length === 16 ? trimmed + ':00' : trimmed}+05:30`;
            const d = new Date(withOffset);
            if (!isNaN(d.getTime())) return d;
        }
        const parsed = new Date(trimmed);
        return isNaN(parsed.getTime()) ? null : parsed;
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
        
        const start = parseLocalDateTime(startTime) || new Date();
        const end = parseLocalDateTime(endTime) || null;
        const imageUrl = req.file.path ? req.file.path.replace('http://', 'https://') : '';

        const ad = new Advertisement({
            title: title || 'Special Offer',
            imageUrl: imageUrl,
            imageId: req.file.filename || '',
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

module.exports.updateAdvertisement = async (req, res) => {
    try {
        const ad = await Advertisement.findById(req.params.id);
        if (!ad) {
            req.flash("error", "Advertisement not found");
            return res.redirect("/admin/advertisements");
        }

        const { title, link, phoneNumber, startTime, endTime } = req.body;

        if (req.file) {
            const oldPublicId = getCloudinaryPublicId(ad);
            if (oldPublicId) {
                try {
                    await cloudinary.uploader.destroy(oldPublicId, { invalidate: true, resource_type: 'image' });
                } catch (cErr) {
                    console.error('Error deleting old Cloudinary image:', cErr);
                }
            }
            ad.imageUrl = req.file.path ? req.file.path.replace('http://', 'https://') : '';
            ad.imageId = req.file.filename || '';
        }

        if (title !== undefined) ad.title = title || 'Special Offer';
        if (link !== undefined) ad.link = link || '';
        if (phoneNumber !== undefined) ad.phoneNumber = phoneNumber || '';
        
        if (startTime !== undefined) {
            ad.startTime = parseLocalDateTime(startTime) || ad.startTime || new Date();
        }

        if (endTime !== undefined) {
            ad.endTime = parseLocalDateTime(endTime) || null;
        }

        await ad.save();
        req.flash("success", "Advertisement updated successfully");
        res.redirect("/admin/advertisements");
    } catch (error) {
        console.error('Error updating advertisement:', error);
        req.flash("error", "Failed to update advertisement");
        res.redirect("/admin/advertisements");
    }
};


