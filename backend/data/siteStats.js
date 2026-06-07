const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const siteStatsSchema = new Schema({
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        unique: true
    },
    visits: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("SiteStat", siteStatsSchema);
