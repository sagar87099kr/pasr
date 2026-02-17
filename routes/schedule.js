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
        // res.render("shedule", { id, existingDays: doc?.days || [] });
        // Redirect to profile where the calendar is actually implemented
        res.redirect(`/provider/${id}/profile`);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

// POST form -> saves schedule to MongoDB
router.post("/shedule/:id", isLogedin, isOwner, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[Schedule POST] Hit for ID: ${id}`);

        if (!mongoose.isValidObjectId(id)) return res.status(400).send("Invalid id");

        const raw = req.body.daysJson;
        console.log(`[Schedule POST] Raw Body length: ${raw ? raw.length : 0}`);

        if (!raw) return res.status(400).send("Missing daysJson");

        let parsed = JSON.parse(raw);
        console.log(`[Schedule POST] Parsed items: ${parsed.length}`);

        if (!Array.isArray(parsed)) return res.status(400).send("daysJson must be array");

        // sanitize + de-dupe
        const map = new Map();
        for (const item of parsed) {
            const date = String(item?.date || "").trim();
            const status = String(item?.status || "free");
            const timeSlots = Array.isArray(item?.timeSlots) ? item.timeSlots : [];

            if (!isISODate(date)) {
                console.log(`[Schedule POST] Skipping invalid date: '${date}'`);
                continue;
            }
            if (!["free", "busy"].includes(status)) continue;

            // Simple validation for slots
            const validSlots = timeSlots.filter(s => s.start && s.end);

            map.set(date, { date, status, timeSlots: validSlots });
        }

        // Keep only 2026 dates
        const cleaned = Array.from(map.values())
            .filter(d => d.date.startsWith("2026-"))
            .sort((a, b) => a.date.localeCompare(b.date));

        const logData = `[${new Date().toISOString()}] ID: ${id} | RawLen: ${raw ? raw.length : 0} | Parsed: ${parsed ? parsed.length : 0} | Cleaned: ${cleaned ? cleaned.length : 0}\n`;
        require('fs').appendFileSync('debug_log.txt', logData);

        const updateResult = await Shedule.findOneAndUpdate(
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
