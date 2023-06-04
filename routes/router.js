const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../middleware/auth");


const Shop = require("../models/shop");
const Product = require("../models/product");
const User = require("../models/user");




const twilio = require("twilio")(process.env.twilioAccountSid, process.env.twilioAuthToken);


router.post('/api/login/sendphoneotp', async (req, res) => {
  try {
    const { phone } = req.body;

    const verification = await twilio.verify.v2
      .services(process.env.twilioVerifySid)
      .verifications.create({ to: "+91" + phone, channel: "sms" });
    if (verification.status === "pending") {
      res.status(200).json({
        success: true,
        message: "OTP sent to "+phone
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
      .services(process.env.twilioVerifySid)
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

router.get("/api/shops/:id", async (req, res) => {
  try{
  const shopId = req.params.id;

  const shop = await Shop.findById(shopId);

  if (!shop){
    return res.status(404).json({
      "success" : "false",
      "message" : "Shop not found"
    });
  }

  const products = await Product.find({_id: {$in: shop.shopprods}});

  res.json({shop, products});
}catch (error) {
  console.error('Error retrieving restaurant details:', error);
  res.status(500).json({ error: 'Internal server error' });
}

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


// router.get('/api/search', async (req, res) => {
//   try {
//     const query = req.query.q;

//     const products = await Product.find(
//       { prodname: { $regex: query, $options: 'i' } }
//     );

//     const productIds = products.map(product => product._id);

//     const shops = await Shop.find({ shopprods: { $in: productIds } });

//     const result = shops.map(shop => {
//       const matchedProducts = products.filter(product =>
//         shop.shopprods.includes(product._id)
//       );

//       return {
//         shop,
//         products: matchedProducts
//       };
//     });

//     res.json(result);
//   } catch (error) {
//     console.error('Error searching products:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.get('/api/searchshopforproduct', async (req, res) => {
  try {
    const query = req.query.q;

    const products = await Product.aggregate([
      {
        $search : {
          index: "default",
          autocomplete:{
            query: query,
            path: "prodname",
            fuzzy: {maxEdits: 1, prefixLength: 2}
          },
          autocomplete:{
            query: query,
            path: "prodcategory",
            fuzzy: {maxEdits: 1, prefixLength: 2}
          },
        },
      },
      {
        $project: {
          prodname: 1,
          prodimages:1,
          score: {$meta: "searchScore"},
        },
      },
      { $limit: 10},
    ]);


    const productIds = products.map(product => product._id);

    const shops = await Shop.find({ shopprods: { $in: productIds } });

    const result = shops.map(shop => {
      const matchedProducts = products.filter(product =>
        shop.shopprods.includes(product._id)
      );
      

      return {
        shop,
        products: matchedProducts
      };
    });

    res.json({success: true,
      result: result});
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
    const verification = await twilio.verify.v2.services(process.env.twilioVerifySid)
    .verifications.create({ to: "+91" + phone, channel: "sms" });
    if (verification.status === "pending") {
      res.status(200).json({
        success: true,
        message: "OTP sent to "+phone
      });
    }
  }catch(error){
    res.status(400).json({
      error: error
    });
  }
});

router.put("/api/user/verifyotpphoneupdate", authenticateUser, async (req, res) => {
  try{
    const {phone, otp} = req.body;
    let user = await User.findOne({phone});
    if (phone === req.user.phone || user?._id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "THIS CONTACT NUMBER IS ALREADY REGISTERED",
      });
    }
    const verifCheck = await twilio.verify.v2
      .services(process.env.twilioVerifySid)
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