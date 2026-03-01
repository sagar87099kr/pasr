const { doubleCsrf } = require("csrf-csrf");

const doubleCsrfConfig = doubleCsrf({
    getSecret: (req) => {
        // Return SECRET if defined and not empty, otherwise use fallback
        if (process.env.SECRET && process.env.SECRET.length > 0) return process.env.SECRET;
        return "pasr-default-secret-fallback-123";
    },
    cookieName: "pasr-csrf-token",
    cookieOptions: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || process.env.RENDER === "true",
        signed: !!process.env.SECRET, // sign if secret exists, matching cookieParser
    },
    getTokenFromRequest: (req) => req.body?._csrf || req.headers["x-csrf-token"] || req.headers["x-xsrf-token"],
});

module.exports = doubleCsrfConfig;
