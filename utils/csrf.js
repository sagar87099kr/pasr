const { doubleCsrf } = require("csrf-csrf");

const doubleCsrfConfig = doubleCsrf({
    getSecret: (req) => process.env.SECRET,
    cookieName: "pasr-csrf-token",
    cookieOptions: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
    },
    getTokenFromRequest: (req) => req.body?._csrf || req.headers["x-csrf-token"],
});

module.exports = doubleCsrfConfig;
