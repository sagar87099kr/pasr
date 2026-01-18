require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pasr_DEV',
    allowedFormats: ["png","jpg","jpeg"] ,// supports promises as well
    transformation:[
      {width:1200,height:1200,crop:"limit",quality:"auto"},
    ],
  },
});

module.exports = {
    cloudinary,
    storage,
}