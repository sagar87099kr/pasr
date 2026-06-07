const Notification = require("../data/notification");

module.exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.user._id,
            isRead: false
        }).sort({ createdAt: -1 }).limit(20);

        res.status(200).json({ success: true, notifications });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user._id },
            { isRead: true }
        );
        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

module.exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ success: true, message: "All marked as read" });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
