const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

const normalizeVariantValue = (value) => String(value || "").trim().toLowerCase();

const parseQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return null;
  }

  return quantity;
};

const findVariant = (product, size, color) =>
  product.variants?.find(
    (variant) =>
      normalizeVariantValue(variant.size) === size &&
      normalizeVariantValue(variant.color) === color
  );

const buildCartResponse = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product").lean();

  if (!cart) {
    return { items: [], total: 0 };
  }

  const items = (cart.items || []).filter((item) => item.product);
  const total = items.reduce(
    (accumulator, item) => accumulator + item.product.price * item.quantity,
    0
  );

  return {
    ...cart,
    items,
    total,
  };
};

const addToCart = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productId, size, color } = req.body;
    const quantity = parseQuantity(req.body.quantity ?? 1);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Valid product ID required" });
    }

    if (!size || !color) {
      return res.status(400).json({ message: "Please select size and color" });
    }

    if (!quantity) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const normalizedSize = normalizeVariantValue(size);
    const normalizedColor = normalizeVariantValue(color);
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = findVariant(product, normalizedSize, normalizedColor);
    if (!variant) {
      return res.status(400).json({ message: "Invalid size or color selected" });
    }

    if (quantity > variant.stock) {
      return res.status(400).json({
        message: `Only ${variant.stock} items available`,
      });
    }

    const canonicalSize = variant.size;
    const canonicalColor = variant.color;
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [{ product: productId, quantity, size: canonicalSize, color: canonicalColor }],
      });
    } else {
      const item = cart.items.find(
        (entry) =>
          entry.product.toString() === productId &&
          normalizeVariantValue(entry.size) === normalizedSize &&
          normalizeVariantValue(entry.color) === normalizedColor
      );

      if (item) {
        const newQuantity = item.quantity + quantity;

        if (newQuantity > variant.stock) {
          return res.status(400).json({
            message: `Only ${variant.stock} items available`,
          });
        }

        item.quantity = newQuantity;
      } else {
        cart.items.push({
          product: productId,
          quantity,
          size: canonicalSize,
          color: canonicalColor,
        });
      }
    }

    await cart.save();
    return res.json(await buildCartResponse(req.user._id));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUserCart = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.json(await buildCartResponse(req.user._id));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateCartItem = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productId, size, color } = req.body;
    const quantity = parseQuantity(req.body.quantity);

    if (!mongoose.Types.ObjectId.isValid(productId) || !size || !color) {
      return res.status(400).json({ message: "Missing product or variant data" });
    }

    if (!quantity) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const normalizedSize = normalizeVariantValue(size);
    const normalizedColor = normalizeVariantValue(color);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = findVariant(product, normalizedSize, normalizedColor);
    if (!variant) {
      return res.status(400).json({ message: "Invalid variant" });
    }

    if (quantity > variant.stock) {
      return res.status(400).json({
        message: `Only ${variant.stock} items available`,
      });
    }

    const item = cart.items.find(
      (entry) =>
        entry.product.toString() === productId &&
        normalizeVariantValue(entry.size) === normalizedSize &&
        normalizeVariantValue(entry.color) === normalizedColor
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    item.quantity = quantity;
    item.size = variant.size;
    item.color = variant.color;
    await cart.save();

    return res.json(await buildCartResponse(req.user._id));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const removeCartItem = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productId, size, color } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const normalizedSize = normalizeVariantValue(size);
    const normalizedColor = normalizeVariantValue(color);

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          normalizeVariantValue(item.size) === normalizedSize &&
          normalizeVariantValue(item.color) === normalizedColor
        )
    );

    if (cart.items.length === originalLength) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    await cart.save();
    return res.json(await buildCartResponse(req.user._id));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addToCart,
  getUserCart,
  updateCartItem,
  removeCartItem,
};
