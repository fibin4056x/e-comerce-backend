const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeText = (value) => String(value || "").trim();

const normalizeShippingAddress = (shippingAddress = {}) => ({
  address: normalizeText(shippingAddress.address),
  city: normalizeText(shippingAddress.city),
  postalCode: normalizeText(shippingAddress.postalCode),
  country: normalizeText(shippingAddress.country),
});

const allowedPaymentMethods = new Set(["COD", "Stripe", "Paypal"]);
const allowedStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

const restoreOrderStock = async (order, session) => {
  for (const item of order.orderItems) {
    const updateResult = await Product.updateOne(
      {
        _id: item.product,
        "variants.size": item.size,
        "variants.color": item.color,
      },
      {
        $inc: { "variants.$.stock": item.quantity },
      },
      { session }
    );

    if (!updateResult.matchedCount) {
      throw createHttpError(409, `Unable to restore stock for ${item.name}`);
    }
  }
};

const getErrorStatus = (error) => error.statusCode || 500;

const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    if (!req.user?._id) {
      throw createHttpError(401, "Unauthorized");
    }

    const shippingAddress = normalizeShippingAddress(req.body.shippingAddress);
    const paymentMethod = req.body.paymentMethod || "COD";

    if (shippingAddress.address.length < 10) {
      throw createHttpError(400, "Invalid address");
    }

    if (
      !shippingAddress.city ||
      !shippingAddress.postalCode ||
      !shippingAddress.country
    ) {
      throw createHttpError(400, "Incomplete address");
    }

    if (!allowedPaymentMethods.has(paymentMethod)) {
      throw createHttpError(400, "Invalid payment method");
    }

    const cart = await Cart.findOne({ user: req.user._id }).session(session);
    if (!cart?.items?.length) {
      throw createHttpError(400, "Cart empty");
    }

    const productIds = cart.items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds } })
      .session(session)
      .lean();

    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const orderItems = [];
    let totalPrice = 0;

    for (const item of cart.items) {
      const product = productMap.get(item.product.toString());

      if (!product) {
        throw createHttpError(404, "Product not found");
      }

      const variant = product.variants.find(
        (entry) => entry.size === item.size && entry.color === item.color
      );

      if (!variant) {
        throw createHttpError(400, `Variant unavailable for ${product.name}`);
      }

      if (variant.stock < item.quantity) {
        throw createHttpError(409, `Insufficient stock for ${product.name}`);
      }

      const updateResult = await Product.updateOne(
        {
          _id: product._id,
          "variants.size": item.size,
          "variants.color": item.color,
          "variants.stock": { $gte: item.quantity },
        },
        {
          $inc: { "variants.$.stock": -item.quantity },
        },
        { session }
      );

      if (!updateResult.modifiedCount) {
        throw createHttpError(409, `Stock update failed for ${product.name}`);
      }

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

    const [order] = await Order.create(
      [
        {
          user: req.user._id,
          orderItems,
          shippingAddress,
          paymentMethod,
          itemsPrice: totalPrice,
          shippingPrice: 0,
          taxPrice: 0,
          totalPrice,
          status: "Pending",
        },
      ],
      { session }
    );

    await Cart.updateOne(
      { user: req.user._id },
      { $set: { items: [] } },
      { session }
    );

    await session.commitTransaction();
    return res.status(201).json(order);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Order failed",
    });
  } finally {
    session.endSession();
  }
};

const getMyOrders = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { status } = req.body;
    if (!allowedStatuses.includes(status)) {
      throw createHttpError(400, "Invalid status");
    }

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      throw createHttpError(404, "Order not found");
    }

    if (order.status === "Cancelled" && status !== "Cancelled") {
      throw createHttpError(400, "Cancelled orders cannot be reopened");
    }

    if (order.status === "Delivered" && status !== "Delivered") {
      throw createHttpError(400, "Delivered orders cannot be rolled back");
    }

    if (status === "Cancelled") {
      if (order.status === "Cancelled") {
        throw createHttpError(400, "Order already cancelled");
      }

      if (order.status === "Delivered") {
        throw createHttpError(400, "Delivered orders cannot be cancelled");
      }

      await restoreOrderStock(order, session);
      order.isDelivered = false;
      order.deliveredAt = null;
    }

    if (status === "Delivered") {
      order.isDelivered = true;
      order.deliveredAt = order.deliveredAt || new Date();
    }

    order.status = status;
    await order.save({ session });

    await session.commitTransaction();
    return res.json(order);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      throw createHttpError(404, "Order not found");
    }

    if (order.user.toString() !== req.user._id.toString()) {
      throw createHttpError(403, "Not allowed");
    }

    if (order.status === "Cancelled") {
      throw createHttpError(400, "Order already cancelled");
    }

    if (["Shipped", "Delivered"].includes(order.status)) {
      throw createHttpError(400, "Order cannot be cancelled after shipping");
    }

    await restoreOrderStock(order, session);
    order.status = "Cancelled";
    order.isDelivered = false;
    order.deliveredAt = null;
    await order.save({ session });

    await session.commitTransaction();
    return res.json({ message: "Order cancelled" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(getErrorStatus(error)).json({
      message: error.message || "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

const markDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Cancelled orders cannot be delivered" });
    }

    if (order.status === "Delivered") {
      return res.status(400).json({ message: "Order already delivered" });
    }

    order.status = "Delivered";
    order.isDelivered = true;
    order.deliveredAt = new Date();
    await order.save();

    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  markDelivered,
};
