const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    shop:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },

    orderContents:[
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },

            quantity:{
                type: Number,
                required: true
            },
        },
    ],

    orderTotal: {
        type: Number,
        required: true,
    },

    deliveryAddress:{
        addressTag: {
            type: String,
            trim: true,
          },
          completeAddress: {
            type: String,
            trim: true,
          },
          latitude: {
            type: Number,
          },
          longitude: {
            type: Number,
          },
    },

    orderDate: {
        type: Date,
    },

    orderStatus:{
        type: String,
        required: true,
        default: "placed",
        lowercase: true,
    }
});




module.exports = mongoose.model('Order', orderSchema);