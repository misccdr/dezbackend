const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../middleware/auth");


const Shop = require("../models/shop");
const Product = require("../models/product");
const User = require("../models/user");


const twilioAccountSid = "AC34158e1a987aab305d4a4407deb4df9f";
const twilioAuthToken = "a978d5d335c3c55796dbe2b8e5c7d646";
const twilioVerifySid = "VA79f922fcfc4e1a77b7d9f12a586d985d";
const twilio = require("twilio")(twilioAccountSid, twilioAuthToken);


router.post('/api/login/sendphoneotp', async (req, res) => {
  try {
    const { phone } = req.body;

    const verification = await twilio.verify.v2
      .services(twilioVerifySid)
      .verifications.create({ to: "+91" + phone, channel: "sms" });
    if (verification.status === "pending") {
      res.status(200).json({
        success: true,
        verification,
        phone,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/api/login/verifyphoneotp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const verificationCheck = await twilio.verify.v2
      .services(twilioVerifySid)
      .verificationChecks.create({ to: `+91${phone}`, code: otp });
    if (verificationCheck.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "ENTERED WRONG OTP",
      });
    }
    if (verificationCheck.status === "approved") {
      let user = await User.findOne({ phone: phone });
      if (!user) {
        user = await User.create({
          phone: phone,
          username: `user${phone}`,
        });
      }
      const token = await user.generateAuthToken();
      res.setHeader("Authorization", `Bearer ${token}`);
      // res.cookie("token", token, {
      //   httpOnly: true,
      //   expires: new Date(
      //     Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      //   ),
      // });
      return res.status(200).json({
        success: true,
        user,
        token,
      });
    }
  } catch (error) {
    res.status(500).send(error);  
    console.log(error);
  }
});


router.get('/api/products/getAllProducts', async (req, res) => {
  const products = await Product.find(req.query);
  res.status(200).json({ products });
})


router.get('/api/shops/getAllShops', async (req, res) => {
  const shops = await Shop.find(req.query);
  res.status(200).json({ shops });
})

router.get("/api/shops/:id", (req, res) => {
  const shopId = req.params.id;

  Shop.findById(shopId).then((shop) => {
    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    res.json(shop)
  })
    .catch((error) => {
      // Handle any errors that occur during the query
      console.error("Error retrieving shop:", error);
      res.status(500).json({ error: "Failed to retrieve shop" });
    });
})  

router.get("/api/products/:prodshop", (req, res) => {
  const prodshop = req.params.prodshop;

  Product.find({ prodshop })
    .then((products) => {
      res.json(products);
    })
    .catch((error) => {
      console.error("Failed to retrieve products:", error);
      res.status(500).json({ error: "Failed to retrieve products" });
    });
});


router.get("/api/user/getuser",  authenticateUser, async(req, res) => {
  try{
    const user = await User.findById(req.user._id)

    if(!user){
      return res.status(401).json({
        success: false,
        user: "null"
      });  
    }
    res.status(200).json({
      success: true,
      user: user
    })
  }catch(error){
    res.status(500).send(error);
  }
});

router.put("/api/user/updateuserdetails", authenticateUser, async(req, res) => {
  try{
    const updatedInfo = {
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
    };
    const findUser = await User.findByIdAndUpdate(req.user._id, updatedInfo, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    if (!findUser) {
      return res.status(500).json({
        success: false,
        message: "PROFILE NOT UPDATED",
      });
    }

    res.status(201).json({
      success: true,
      message: "PROFILE UPDATED", 
    });

  }catch(error){
    res.status(500).send(error);
  }
})

router.post("/api/user/otpphoneupdate", authenticateUser, async (req, res) => {
  try{
    const {phone} = req.body
    const user = await User.findOne({phone});
    if (phone === req.user.phone || user?._id.equals(req.user._id)){
      return res.status(403).json({
        success: false,
        message: "THIS CONTACT NUMBER IS ALREADY REGISTERED",
      });
    }
    const verification = await twilio.verify.v2.services(twilioVerifySid)
    .verifications.create({ to: "+91" + phone, channel: "sms" });
    if (verification.status === "pending") {
      res.status(200).json({
        success: true,
        message: "OTP send to " + phone
      });
    }
  }catch(error){
    res.status(400).send(error);
  }
});

router.put("/api/user/verifyotpphoneupdate", authenticateUser, async (req, res) => {
  try{
    let user = await User.findOne({phone});
    const verifCheck = await twilio.verify.v2
      .services(twilioVerifySid)
      .verificationChecks.create({ to: `+91${phone}`, code: otp });
    if (verifCheck.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "ENTERED WRONG OTP",
      });
    }

    if (verifCheck.status === "approved"){
      user = await User.findByIdAndUpdate(
        req.user._id,
        {
          $set : {phone: phone},
        },
        {new: true}
      );
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "CONTACT NUMBER NOT UPDATED SUCCESSFULLY",
        });
      }
      return res.status(200).json({
        success: true,
        message: "CONTACT NUMBER UPDATED SUCCESSFULLY",
      });
    }
  }catch(error){
    res.status(500).send(error);
    console.log(error);
  }
})

module.exports = router;