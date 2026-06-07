const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

if (!admin.apps.length) {
    try {
        let serviceAccount;

        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // ✅ Production (Render) — loaded from environment variable
            // Set FIREBASE_SERVICE_ACCOUNT on Render with the full JSON content
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else {
            // ✅ Local development — loaded from file (never committed to Git)
            const keyPath = path.join(__dirname, "../serviceAccountKey.json");
            if (!fs.existsSync(keyPath)) {
                console.error("[Firebase] serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env not set.");
                console.error("[Firebase] Push notifications will be disabled.");
                module.exports = admin; // export uninitialised admin so other requires don't crash
                return;
            }
            serviceAccount = require(keyPath);
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log("[Firebase] Admin SDK initialized successfully.");
    } catch (err) {
        console.error("[Firebase] Failed to initialize Admin SDK:", err.message);
    }
}

module.exports = admin;
