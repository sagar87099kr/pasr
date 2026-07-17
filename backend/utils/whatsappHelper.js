/**
 * whatsappHelper.js — COMMENTED OUT (replaced by MSG91 SMS via msg91Helper.js)
 *
 * This file is kept for reference. The WhatsApp OTP delivery approach has been
 * replaced with MSG91 SMS-based OTP which is more reliable and doesn't require
 * users to have WhatsApp.
 *
 * To re-enable, restore the exports below and add to .env:
 *   WHATSAPP_PHONE_NUMBER_ID=...
 *   WHATSAPP_ACCESS_TOKEN=...
 *   WHATSAPP_OTP_TEMPLATE_NAME=otp_verification
 */

/*
const fetch = require('node-fetch');
const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

async function sendWhatsAppOTP(phone, otp) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'otp_verification';

    if (!phoneNumberId || !accessToken) {
        console.log('\n' + '='.repeat(60));
        console.log('⚠️  WhatsApp API credentials missing from .env');
        console.log('='.repeat(60));
        console.log(`📱 Phone: ${phone}`);
        console.log(`🔑 OTP  : ${otp}   ← USE THIS TO TEST`);
        console.log('='.repeat(60) + '\n');
        return { success: false, simulated: true, otp };
    }

    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

    const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
            name: templateName,
            language: { code: "en_US" },
            components: [
                { type: "body", parameters: [{ type: "text", text: otp }] },
                { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: otp }] }
            ]
        }
    };

    try {
        const response = await fetchFn(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
            console.error("WhatsApp API Error Response:", JSON.stringify(result, null, 2));
            throw new Error(result.error?.message || "Failed to send WhatsApp OTP");
        }
        console.log(`WhatsApp OTP successfully sent to ${formattedPhone}`);
        return { success: true, result };
    } catch (error) {
        console.error("Error communicating with WhatsApp API:", error.message);
        throw error;
    }
}

module.exports = { sendWhatsAppOTP };
*/

// Stub export so any accidental imports don't crash the server
module.exports = {
    sendWhatsAppOTP: async () => {
        console.warn('[whatsappHelper] sendWhatsAppOTP called but this module is disabled. Use msg91Helper instead.');
    }
};
