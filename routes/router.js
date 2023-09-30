const express = require("express");
const router = express.Router();


const base64 = require('base-64');

const { authenticateUser } = require("../middleware/auth");


const Shop = require("../models/shop");
const Product = require("../models/product");
const User = require("../models/user");
const Order = require('../models/order');
const { default: axios } = require("axios");




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
          compound: {
            should:[
              {
                autocomplete:{
                  query: query,
                  path: "prodname",
                  fuzzy: {maxEdits: 2, prefixLength: 2}
                }
              },
              {
                autocomplete:{
                  query: query,
                  path: "prodcategory",
                  fuzzy: {maxEdits: 2, prefixLength: 2}
                }
                
              }
            ],
            minimumShouldMatch: 1,
          }
        },
      },
      {
        $project: {
          prodname: 1,
          prodimages:1,
          prodprice:1,
          score: {$meta: "searchScore"},
        },
      },
      {
        $sort: {  
          score: -1,
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

router.post("/api/create-razorpay-order", async(req, res) => {
  try {
    const requestData =  req.body 

    const data = {
      amount: requestData.amount,
      currency: requestData.currency,
    };

    const credentials = `${process.env.razorpayKeyId}:${process.env.razorpayKeySecret}`;
    const base64Credentials = base64.encode(credentials);

    const headers = {
      "Authorization": `Basic ${base64Credentials}`,
      "Content-Type": "application/json"
    };

    const response = await axios.post("https://api.razorpay.com/v1/orders",  data, { headers });

    const order = response.data

    res.json(order)
  }catch(error){
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
})

router.post('/api/users/:userId/address', authenticateUser ,async (req, res) => {
  const { userId } = req.params;
  const { addressTag, completeAddress, latitude, longitude } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const newAddress = {
      addressTag,
      completeAddress,
      latitude,
      longitude,
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({ success: true, message: "User address updated Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "User address update error" });
  }
});

router.delete('/api/users/:userId/address/:addressId', authenticateUser, async (req, res) => {
  const { userId, addressId } = req.params;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(address => address.id === addressId);

    if (addressIndex === -1) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Address deletion error" });
  }
});

router.post('/api/orders/placeOrder', async (req, res) => {

  // const{
  //   user,
  //   shop,
  //   ordercontents,
  //   orderTotal,
  //   deliveryAddress,
  //   orderDate,
  //   orderStatus
  // } = req.body;

  // try{
  //   await order
  // }

  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ success: true, message: 'Order placed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to place order' });
  }

})


module.exports = router;