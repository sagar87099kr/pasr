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
    allowedFormats: ["png", "jpg", "jpeg"],
    transformation: [
      { width: 1200, height: 1200, crop: "limit", quality: "auto" },
    ],
  },
});

const upload = multer({ storage });

// Separate folder for item photos
const itemStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pasr_items',
    allowedFormats: ["png", "jpg", "jpeg"],
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  },
});

const itemUpload = multer({
  storage: itemStorage,
  limits: { fileSize: 200 * 1024 } // 200KB limit
});

module.exports = {
  cloudinary,
  storage,
  upload,
  itemUpload
}