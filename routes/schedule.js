const express = require("express");
const router = express.Router();
const Shedule = require("../data/clander.js");
const { isLogedin, isOwner } = require("../middeleware.js");
const mongoose = require("mongoose");

function isISODate(s) {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// GET page -> loads saved schedule so everyone sees the same schedule
router.get("/shedule/:id", isLogedin, isOwner, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).send("Invalid id");

        const doc = await Shedule.findOne({ listingId: id }).lean();
        res.render("shedule", { id, existingDays: doc?.days || [] });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// POST form -> saves schedule to MongoDB
router.post("/shedule/:id", isLogedin, isOwner, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).send("Invalid id");

        const raw = req.body.daysJson;
        if (!raw) return res.status(400).send("Missing daysJson");

        let parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return res.status(400).send("daysJson must be array");

        // sanitize + de-dupe
        const map = new Map();
        for (const item of parsed) {
            const date = String(item?.date || "");
            const status = String(item?.status || "");

            if (!isISODate(date)) continue;
            if (!["free", "busy"].includes(status)) continue;

            map.set(date, { date, status });
        }

        // Keep only 2026 dates
        const cleaned = Array.from(map.values())
            .filter(d => d.date.startsWith("2026-"))
            .sort((a, b) => a.date.localeCompare(b.date));

        await Shedule.findOneAndUpdate(
            { listingId: id },
            { listingId: id, days: cleaned, updatedBy: req.user?._id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.redirect(`/provider/${id}/profile`);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
