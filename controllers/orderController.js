const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

/* ==========================================
   CREATE ORDER
========================================== */

const createOrder = async (req, res) => {

  console.log("🟢 ORDER CREATE START");

  try {

    const userId = req.user._id;
    const { shippingAddress } = req.body;

    console.log("➡ USER:", userId);
    console.log("➡ BODY:", req.body);


    /* ===============================
       VALIDATE ADDRESS
    =============================== */

    if (!shippingAddress)
      return res.status(400).json({ message: "Shipping address required" });

    const { address, city, postalCode, country } = shippingAddress;

    if (!address || address.trim().length < 10)
      return res.status(400).json({ message: "Invalid address" });

    if (/^[0-9\s]+$/.test(address))
      return res.status(400).json({ message: "Address cannot be numeric only" });

    if (!/^[a-zA-Z\s]{2,50}$/.test(city))
      return res.status(400).json({ message: "Invalid city name" });



    /* ===============================
       FETCH CART
    =============================== */

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .lean();

    console.log("➡ CART FOUND:", !!cart);

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart empty" });


    /* ===============================
       GET PRODUCT IDS
    =============================== */

    const productIds = cart.items.map(i => i.product._id);

    const products = await Product.find({
      _id: { $in: productIds }
    });

    console.log("➡ PRODUCTS FETCHED:", products.length);



    /* ===============================
       BUILD ORDER ITEMS
    =============================== */

    let totalPrice = 0;
    const orderItems = [];

    for (const cartItem of cart.items) {

      const product = products.find(
        p => p._id.toString() === cartItem.product._id.toString()
      );

      if (!product)
        return res.status(404).json({ message: "Product not found" });


      const variant = product.variants.find(
        v => v.size === cartItem.size && v.color === cartItem.color
      );

      if (!variant)
        return res.status(400).json({ message: "Variant not found" });


      if (variant.stock < cartItem.quantity)
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`
        });


      /* STOCK UPDATE */

     await Product.updateOne(
            {
                    _id: product._id,
                    "variants.size": cartItem.size,
                    "variants.color": cartItem.color,
                    "variants.stock": { $gte: cartItem.quantity }
            },
            {
              $inc: { "variants.$.stock": -cartItem.quantity }
            }
            );


      totalPrice += product.price * cartItem.quantity;


      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        size: cartItem.size,
        color: cartItem.color,
        quantity: cartItem.quantity,
        price: product.price
      });

    }



    /* ===============================
       CREATE ORDER
    =============================== */

    const order = await Order.create({

      user: userId,
      orderItems,
      shippingAddress,

      itemsPrice: totalPrice,
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice,

      status: "Pending"

    });

    console.log("✅ ORDER CREATED:", order._id);



    /* ===============================
       CLEAR CART
    =============================== */

    await Cart.updateOne(
      { user: userId },
      { $set: { items: [] } }
    );

    console.log("🗑 CART CLEARED");


    res.status(201).json(order);

  } catch (error) {

    console.error("🔥 CREATE ORDER ERROR");
    console.error(error);

    res.status(500).json({
      message: error.message
    });

  }

};



/* ==========================================
   GET USER ORDERS
========================================== */

const getmyOrders = async (req, res) => {

  try {

    console.log("📦 GET USER ORDERS:", req.user._id);

    const orders = await Order.find({
      user: req.user._id
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("📦 ORDERS COUNT:", orders.length);

    res.json(orders);

  } catch (error) {

    console.error("🔥 USER ORDER FETCH ERROR");
    console.error(error);

    res.status(500).json({ message: error.message });

  }

};



/* ==========================================
   GET ALL ORDERS (ADMIN)
========================================== */

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username email")   // IMPORTANT
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    console.error("ADMIN ORDER FETCH ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};



/* ==========================================
   UPDATE ORDER STATUS
========================================== */

const updateOrderStatus = async (req, res) => {

  try {

    const { status } = req.body;

    console.log("➡ UPDATE STATUS:", status);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    res.json(order);

  } catch (error) {

    console.error("🔥 UPDATE STATUS ERROR");
    console.error(error);

    res.status(500).json({ message: error.message });

  }

};



/* ==========================================
   CANCEL ORDER
========================================== */

const cancelOrder = async (req, res) => {
  try {

    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    // user cannot cancel after shipping
    if (order.status === "Shipped" || order.status === "Delivered") {
      return res.status(400).json({
        message: "Order cannot be cancelled after shipping"
      });
    }

    order.status = "Cancelled";

    await order.save();

    res.json({ message: "Order cancelled" });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: error.message
    });

  }
};



/* ==========================================
   MARK ORDER PAID
========================================== */

const markDelivered = async (req, res) => {
  try {

    const order = await Order.findById(req.params.id);

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    order.status = "Delivered";
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    await order.save();

    res.json(order);

  } catch (error) {

    console.error("DELIVER ERROR:", error);

    res.status(500).json({
      message: error.message
    });

  }
};



module.exports = {

  createOrder,
  getmyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  markDelivered

};