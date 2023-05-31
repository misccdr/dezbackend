require("dotenv").config();
const express = require("express");
const app = express();
const connectDB = require("./db/connect");

const PORT = process.env.PORT || 3000;

const router = require("./routes/router");

app.get("/", (req, res) => {
    res.send("Hi, i am live");
});
 
app.use(express.json());

app.use(router);


const start = async ( ) =>{
    try {
        await connectDB();
        app.listen(PORT, ( ) => {
            console.log(`${PORT} Yes, I am connected`);
        });
    }catch(error){
        console.log(error);
    }
};

start();