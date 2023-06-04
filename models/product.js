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
    prodimages: [String],
    
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