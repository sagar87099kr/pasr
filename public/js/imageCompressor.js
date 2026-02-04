document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const MAX_SIZE_MB = 1;
    const MAX_WIDTH_HEIGHT = 1920; // Good balance for quality

    // Find all file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');

    fileInputs.forEach(input => {
        input.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const dataTransfer = new DataTransfer();
            let hasLargeFile = false;
            let processedCount = 0;

            // Show loading state if possible (optional UI enhancement)
            const submitBtns = document.querySelectorAll('button[type="submit"]');
            submitBtns.forEach(btn => btn.disabled = true);
            const originalCursor = document.body.style.cursor;
            document.body.style.cursor = 'wait';

            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];

                    // Check if image and size > 1MB
                    if (file.type.startsWith('image/') && file.size > MAX_SIZE_MB * 1024 * 1024) {
                        hasLargeFile = true;
                        console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

                        const options = {
                            maxSizeMB: MAX_SIZE_MB,
                            maxWidthOrHeight: MAX_WIDTH_HEIGHT,
                            useWebWorker: true
                        };

                        try {
                            const compressedFile = await imageCompression(file, options);
                            console.log(`Compressed ${file.name} to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

                            // Create a new File object from the compressed Blob
                            // imageCompression returns a Blob (or File in newer versions, but let's be safe)
                            const newFile = new File([compressedFile], file.name, {
                                type: file.type,
                                lastModified: Date.now()
                            });

                            dataTransfer.items.add(newFile);
                        } catch (error) {
                            console.error("Compression failed for", file.name, error);
                            // Fallback: Add original file or alert? 
                            // Adding original file effectively ignores the error but might fail upload.
                            // Let's add original and warn.
                            dataTransfer.items.add(file);
                            alert(`Could not compress ${file.name}. It might be too large to upload.`);
                        }
                    } else {
                        // Small enough or not an image
                        dataTransfer.items.add(file);
                    }
                    processedCount++;
                }

                // Update input files
                if (hasLargeFile && processedCount === files.length) {
                    event.target.files = dataTransfer.files;
                    console.log("All files processed and input updated.");
                }

            } catch (err) {
                console.error("Error processing files:", err);
            } finally {
                // Restore state
                submitBtns.forEach(btn => btn.disabled = false);
                document.body.style.cursor = originalCursor;
            }
        });
    });
});
