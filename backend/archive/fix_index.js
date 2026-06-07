require('dotenv').config();
const mongoose = require("mongoose");
const Post = require("./data/keshanSabhaPost.js");

async function run() {
    await mongoose.connect(process.env.ATLAS_DB_URL);
    console.log("Collection name:", Post.collection.name);
    try {
        await Post.collection.drop();
        console.log("Collection dropped.");
    } catch (e) {
        console.log("Drop error:", e.message);
    }
    await Post.init();
    console.log("Indexes built on restart!");
    await mongoose.connection.close();
}
run();
