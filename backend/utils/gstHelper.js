/**
 * GST Verification Helper
 * 
 * In a production environment, this would call a real GST API (like gstapi.in, eko.in, etc.)
 * For now, it implements a mock verification logic.
 */

const verifyGST = async (gstin) => {
    // Regex for basic validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstRegex.test(gstin)) {
        return { valid: false, message: "Invalid GST format" };
    }

    // SIMPLIFIED MOCK LOGIC: 
    // We only perform regex validation and return a generic success.
    // Manual verification will be done later by the admin.

    return new Promise((resolve) => {
        setTimeout(() => {
            if (gstin.includes("0000")) {
                resolve({ valid: false, message: "GSTIN not found or inactive" });
            } else {
                resolve({
                    valid: true,
                    message: "GST Received. We will verify it and notify you."
                });
            }
        }, 600);
    });
};

module.exports = { verifyGST };
