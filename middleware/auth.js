const jwt = require("jsonwebtoken");
const User = require("../models/user");


const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers['authorization'];
        if (!token) {
            return res.status(401).send("PLEASE LOGIN TO ACCESS THIS DATA");
        }
        const verifyUser = await jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findOne({ _id: verifyUser._id });
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).send("Authentication failed");
    }
}

module.exports = {
    authenticateUser
};