const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    shopname: {
        type: String,
        required: true
    },
    shopimg: {
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
    },
    shopavgrating: {
        type: Number,
        default: 0.0
    },
    shopprods: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }
      ]
    ,
    veg: {
        type: Boolean,
        required: true
    },  
    shopcategories: {
        type: [String],
        maxLength: 2
    }
});

const Shop = new mongoose.model("Shop", shopSchema);
module.exports = Shop;