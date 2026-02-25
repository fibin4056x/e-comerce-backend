const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

/* ==========================================
   CREATE ORDER
========================================== */
const createOrder = async (req, res) => {
  console.log("🔥 CREATE ORDER START");

  try {
    console.log("➡ USER:", req.user?._id);
    console.log("➡ BODY:", req.body);

    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      console.log("❌ Shipping address missing");
      return res.status(400).json({
        message: "Shipping address required",
      });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    console.log("➡ CART FOUND:", cart ? "YES" : "NO");

    if (!cart || cart.items.length === 0) {
      console.log("❌ Cart empty");
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    let totalPrice = 0;
    const orderItems = [];

    /* ==========================================
       STOCK CHECK + REDUCE
    ========================================== */
    for (const item of cart.items) {
      console.log("🛒 Processing Item:", item.product.name);

      const product = await Product.findById(
        item.product._id
      );

      if (!product) {
        console.log("❌ Product not found in DB");
        return res.status(404).json({
          message: "Product not found",
        });
      }

      const variant = product.variants.find(
        (v) =>
          v.size === item.size &&
          v.color === item.color
      );

      if (!variant) {
        console.log("❌ Variant not found");
        return res.status(400).json({
          message: `Variant not found for ${product.name}`,
        });
      }

      console.log(
        "📦 Current Stock:",
        variant.stock,
        "| Requested:",
        item.quantity
      );

      if (variant.stock < item.quantity) {
        console.log("❌ Insufficient stock");
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      variant.stock -= item.quantity;

      console.log(
        "✅ Stock After Deduction:",
        variant.stock
      );

      await product.save();
      console.log("💾 Product saved");

      totalPrice += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: product.price,
      });
    }

    console.log("💰 TOTAL PRICE:", totalPrice);

    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress,
      totalPrice,
    });

    console.log("🧾 ORDER CREATED:", order._id);

    cart.items = [];
    await cart.save();
    console.log("🗑 Cart cleared");

    res.status(201).json(order);

  } catch (error) {
    console.error("🔥 ORDER ERROR:");
    console.error(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ==========================================
   GET MY ORDERS
========================================== */
const getmyOrders = async (req, res) => {
  try {
    console.log("📦 Fetching orders for:", req.user._id);

    const orders = await Order.find({
      user: req.user._id,
    });

    console.log("📦 Orders Found:", orders.length);

    res.json(orders);
  } catch (error) {
    console.error("🔥 FETCH ORDER ERROR:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getmyOrders,
};