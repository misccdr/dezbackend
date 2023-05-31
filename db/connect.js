const mongoose = require("mongoose");

uri = process.env.MONGODB_URL

const connectDB = ( ) => {
    return mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
};
 
module.exports = connectDB;