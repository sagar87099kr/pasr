/**
 * msg91Helper.js
 *
 * Uses MSG91 OTP REST API.
 * Requires:
 *   MSG91_AUTH_KEY=<your_auth_key>
 *   MSG91_TEMPLATE_ID=<OTP_TEMPLATE_ID>  // From OTP -> Templates (NOT SMS Template)
 *
 * Node.js >= 18 (uses native fetch)
 */

const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

const BASE_URL = "https://control.msg91.com/api/v5/otp";

/**
 * Send OTP
 * @param {string|number} phone
 */
const axios = require("axios");

async function sendOTP(phone) {
    if (!AUTH_KEY || !TEMPLATE_ID) {
        console.log("\n======================================");
        console.log("MSG91 credentials missing");
        console.log("Phone:", phone);
        console.log("OTP : 123456");
        console.log("======================================\n");
        return { simulated: true, otp: "123456" };
    }

    const phoneStr = String(phone).trim();
    const mobile = phoneStr.startsWith("91") ? phoneStr : `91${phoneStr}`;

    const otpLength = process.env.MSG91_OTP_LENGTH || "6";
    const otpExpiry = process.env.MSG91_OTP_EXPIRY || "5";

    try {
        const response = await axios.post(
            "https://control.msg91.com/api/v5/otp",
            null,
            {
                params: {
                    mobile,
                    authkey: AUTH_KEY,
                    otp_expiry: otpExpiry,
                    otp_length: otpLength,
                    template_id: TEMPLATE_ID
                },
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("========== MSG91 SEND OTP (AXIOS) ==========");
        console.log(response.data);
        console.log("============================================");

        if (response.data.type === "error") {
            throw new Error(response.data.message || "MSG91 Send Error");
        }

        return {
            simulated: false,
            success: true,
            requestId: response.data.request_id || null,
            response: response.data
        };
    } catch (err) {
        console.error("MSG91 Send OTP Error:", err.message);
        throw err;
    }
}

/**
 * Verify OTP
 * @param {string|number} phone
 * @param {string} otp
 */
async function verifyOTP(phone, otp) {

    if (!AUTH_KEY) {
        return otp === "123456";
    }

    const phoneStr = String(phone).trim();
    const mobile = phoneStr.startsWith("91")
        ? phoneStr
        : `91${phoneStr}`;

    const url =
        `${BASE_URL}/verify?mobile=${mobile}&otp=${otp}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                authkey: AUTH_KEY,
                Accept: "application/json"
            }
        });

        const data = await response.json();

        console.log("========== MSG91 VERIFY OTP ==========");
        console.log(data);
        console.log("======================================");

        if (!response.ok) {
            return false;
        }

        return (
            data.type === "success" ||
            (data.message &&
                data.message.toLowerCase().includes("success"))
        );

    } catch (err) {
        console.error("MSG91 Verify OTP Error:", err.message);
        return false;
    }
}

module.exports = {
    sendOTP,
    verifyOTP
};