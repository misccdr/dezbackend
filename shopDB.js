require("dotenv").config()

const connectDB = require("./db/connect");

const Shop = require("./models/shop");

const ShopJson = require("./shops.json")

const start = async ( ) => {
    try{
        await connectDB(process.env.MONGODB_URL);
        await Shop.deleteMany();
        await Shop.create(ShopJson);
        console.log("Success");
    }catch(error){
        console.log(error);
    }
}

start();