const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

/* ==========================================
   CREATE ORDER
========================================== */

const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user?._id) {
      await session.abortTransaction();
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user._id;
    const { shippingAddress } = req.body;

    if (!shippingAddress?.address || shippingAddress.address.trim().length < 10) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid address" });
    }

    if (!shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Incomplete address" });
    }

    /* =========================
       CART FETCH
    ========================= */
    const cart = await Cart.findOne({ user: userId })
      .lean()
      .session(session);

    if (!cart?.items?.length) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cart empty" });
    }

    /* =========================
       PRODUCTS FETCH (1 QUERY)
    ========================= */
    const productIds = cart.items.map(i => i.product);

    const products = await Product.find({
      _id: { $in: productIds }
    }).lean().session(session);

    const productMap = new Map(
      products.map(p => [p._id.toString(), p])
    );

    let totalPrice = 0;
    const orderItems = [];

    /* =========================
       PROCESS ITEMS
    ========================= */
    for (const item of cart.items) {
      const product = productMap.get(item.product.toString());

      if (!product) throw new Error("Product not found");

      const variant = product.variants.find(
        v => v.size === item.size && v.color === item.color
      );

      if (!variant) throw new Error("Variant not found");

      if (variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const updated = await Product.updateOne(
        {
          _id: product._id,
          "variants.size": item.size,
          "variants.color": item.color,
          "variants.stock": { $gte: item.quantity }
        },
        {
          $inc: { "variants.$.stock": -item.quantity }
        },
        { session }
      );

      if (!updated.modifiedCount) {
        throw new Error("Stock update failed");
      }

      totalPrice += product.price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: product.price
      });
    }

    /* =========================
       CREATE ORDER
    ========================= */
    const [order] = await Order.create([{
      user: userId,
      orderItems,
      shippingAddress,
      itemsPrice: totalPrice,
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice,
      status: "Pending"
    }], { session });

    /* =========================
       CLEAR CART
    ========================= */
    await Cart.updateOne(
      { user: userId },
      { $set: { items: [] } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(order);

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      message: err.message || "Order failed"
    });
  }
};

/* ==========================================
   GET USER ORDERS
========================================== */

const getmyOrders = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);

  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ==========================================
   GET ALL ORDERS (ADMIN)
========================================== */

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ==========================================
   UPDATE ORDER STATUS
========================================== */

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["Pending", "Shipped", "Delivered", "Cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ==========================================
   CANCEL ORDER (RESTORES STOCK)
========================================== */

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (["Shipped", "Delivered"].includes(order.status)) {
      return res.status(400).json({
        message: "Order cannot be cancelled after shipping"
      });
    }

    /* RESTORE STOCK */
    for (const item of order.orderItems) {
      await Product.updateOne(
        {
          _id: item.product,
          "variants.size": item.size,
          "variants.color": item.color
        },
        {
          $inc: { "variants.$.stock": item.quantity }
        }
      );
    }

    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled" });

  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ==========================================
   MARK DELIVERED
========================================== */

const markDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "Delivered";
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    await order.save();

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
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