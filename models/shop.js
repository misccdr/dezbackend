const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    shopname: {
        type: String,
        required: true
    },
    shopaddr: {
        type: String,
        required: true
    },
    shopoutlet: {
        type: String,
        required: true
    }
});

const Shop = new mongoose.model("Shop", shopSchema);
module.exports = Shop;