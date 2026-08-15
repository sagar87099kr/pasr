require('dotenv').config();
const mongoose = require('mongoose');
const DeliveryPartner = require('./data/deliverypartner');

mongoose.connect(process.env.ATLAS_DB_URL)
  .then(async () => {
    const partner = await DeliveryPartner.findById('6a5b2418205ae8fbfe229b77');
    console.log(JSON.stringify(partner, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
