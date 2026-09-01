require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});


const multer = require('multer');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pasr_DEV',
    allowed_formats: ["png", "jpg", "jpeg", "webp"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit", quality: "auto:good" },
    ],
    format: 'webp',
  },
});

const upload = multer({ storage });

// Separate folder for item photos
const itemStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pasr_items',
    allowed_formats: ["png", "jpg", "jpeg", "webp"],
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto:good" },
    ],
    format: 'webp',
  },
});

const itemUpload = multer({
  storage: itemStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB input limit (will be compressed to <100KB webp on cloud)
});

module.exports = {
  cloudinary,
  storage,
  upload,
  itemUpload
}