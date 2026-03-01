const { doubleCsrf } = require("csrf-csrf");

const doubleCsrfConfig = doubleCsrf({
    getSecret: (req) => process.env.SECRET || "pasr-default-secret-fallback-123",
    cookieName: "pasr-csrf-token",
    cookieOptions: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        signed: false, // already signed via cookieParser if needed, but double-csrf manages its own security
    },
    getTokenFromRequest: (req) => req.body?._csrf || req.headers["x-csrf-token"] || req.headers["x-xsrf-token"],
});

module.exports = doubleCsrfConfig;
