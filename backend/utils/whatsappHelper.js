const fetch = require('node-fetch'); // Using node-fetch if global fetch is not available or just native fetch

// Fallback to global fetch if running on Node 18+
const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');

/**
 * Sends an OTP via the Meta WhatsApp Cloud API.
 * 
 * Be sure to set up these variables in your .env:
 * WHATSAPP_PHONE_NUMBER_ID
 * WHATSAPP_ACCESS_TOKEN
 * WHATSAPP_OTP_TEMPLATE_NAME (default: 'otp_verification')
 * 
 * @param {string} phone - Target phone number
 * @param {string} otp - The OTP generated
 */
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
    
    // Ensure the phone number includes the India country code if not present.
    // The Meta API requires the country code without the '+' symbol.
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

    // Payload structured for a standard authentication template
    const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: "en_US" // Adjust to your template's approved language
            },
            components: [
                {
                    type: "body",
                    parameters: [
                        {
                            type: "text",
                            text: otp
                        }
                    ]
                },
                {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [
                        {
                            type: "text",
                            text: otp
                        }
                    ]
                }
            ]
        }
    };

    try {
        const response = await fetchFn(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
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
