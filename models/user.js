const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const addressSchema = new mongoose.Schema({
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
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    required: true,
    default: "user",
    index: { unique: true, sparse: true },
  },
  email: {
    type: String,
    trim: true,
    index: { unique: true, sparse: true },
  },
  phone: {
    type: Number,
    trim: true,
    index: { unique: true, sparse: true },
  },
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
  addresses: [addressSchema],
});

userSchema.methods.generateAuthToken = async function () {
  try {
    const token = await jwt.sign(
      { _id: this._id.toString() },
      process.env.SECRET_KEY,
      {
        expiresIn: process.env.JWT_EXPIRE,
      }
    );
    this.tokens = this.tokens.concat({ token: token });
    await this.save();
    return token;
  } catch (e) {
    console.log(e);
  }
};




module.exports = mongoose.model("User", userSchema);