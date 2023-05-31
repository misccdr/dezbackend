const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    prodname: {
        type: String,
        required: true
    },
    prodprice: {
        type: Number,
        required: true
    },
    prodshop: {
        type: mongoose.Schema.ObjectId,
        ref: "Shop",
        required: true
    },
    prodimage: {
        type: String,
        required: true
    },
    proddescription: {
        type: String,
        required: true
    },
    prodcategory: {
        type: String,
        required: true
    },
    veg: {
        type: Boolean,
        required: true
    }
})


module.exports = mongoose.model('Product', productSchema);