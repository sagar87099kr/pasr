require('dotenv').config();
const mongoose = require('mongoose');
const Provider = require('./data/serviceproviders');

async function main() {
    await mongoose.connect(process.env.ATLAS_DB_URL);
    const result = await Provider.updateOne(
        { _id: '6a588f4ac3cb18c41d77f70b' },
        { $set: { categories: 'Home Service provider' } }
    );
    console.log(result);
    process.exit(0);
}
main().catch(console.error);
