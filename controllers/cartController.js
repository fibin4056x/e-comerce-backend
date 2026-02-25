const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

/* ==========================================
   ADD TO CART
========================================== */
const addToCart = async (req, res) => {
  try {
    console.log("\n🟢 [ADD TO CART]");
    console.log("User:", req.user?._id);
    console.log("Payload:", req.body);

    const { productId, quantity = 1, size, color } = req.body;

    /* ---------- VALIDATION ---------- */

    if (!productId)
      return res.status(400).json({ message: "Product ID required" });

    if (!size || !color)
      return res.status(400).json({
        message: "Please select size and color",
      });

    const product = await Product.findById(productId);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (!product.variants || product.variants.length === 0)
      return res.status(400).json({ message: "No variants available" });

    const variant = product.variants.find(
      (v) => v.size === size && v.color === color
    );

    if (!variant)
      return res.status(400).json({
        message: "Invalid size or color selected",
      });

    if (quantity > variant.stock)
      return res.status(400).json({
        message: `Only ${variant.stock} items available`,
      });

    /* ---------- CART LOGIC ---------- */

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      console.log("🆕 Creating new cart");
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, quantity, size, color }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) =>
          item.product.toString() === productId &&
          item.size === size &&
          item.color === color
      );

      if (itemIndex > -1) {
        const newQty = cart.items[itemIndex].quantity + quantity;

        if (newQty > variant.stock)
          return res.status(400).json({
            message: `Only ${variant.stock} items available`,
          });

        cart.items[itemIndex].quantity = newQty;
      } else {
        cart.items.push({ product: productId, quantity, size, color });
      }

      await cart.save();
    }

    const populatedCart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    const total = populatedCart.items.reduce(
      (acc, item) =>
        acc + item.product.price * item.quantity,
      0
    );

    console.log("✅ Cart Updated | Items:", populatedCart.items.length);

    res.json({
      ...populatedCart.toObject(),
      total,
    });

  } catch (error) {
    console.error("🔥 ADD TO CART ERROR");
    console.error(error.message);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ==========================================
   GET CART
========================================== */
const getUserCart = async (req, res) => {
  try {
    console.log("\n🟢 [GET CART] User:", req.user?._id);

    const cart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    if (!cart)
      return res.json({ items: [], total: 0 });

    const total = cart.items.reduce(
      (acc, item) =>
        acc + item.product.price * item.quantity,
      0
    );

    res.json({
      ...cart.toObject(),
      total,
    });

  } catch (error) {
    console.error("🔥 GET CART ERROR");
    console.error(error.message);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ==========================================
   UPDATE QUANTITY
========================================== */
const updateCartItem = async (req, res) => {
  try {
    console.log("\n🟢 [UPDATE CART]");
    console.log("Payload:", req.body);

    const { productId, quantity, size, color } = req.body;

    if (!productId || !size || !color)
      return res.status(400).json({
        message: "Missing product or variant data",
      });

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart)
      return res.status(404).json({ message: "Cart not found" });

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find(
      (v) => v.size === size && v.color === color
    );

    if (!variant)
      return res.status(400).json({ message: "Invalid variant" });

    if (quantity > variant.stock)
      return res.status(400).json({
        message: `Only ${variant.stock} items available`,
      });

    const item = cart.items.find(
      (i) =>
        i.product.toString() === productId &&
        i.size === size &&
        i.color === color
    );

    if (!item)
      return res.status(404).json({ message: "Item not found in cart" });

    item.quantity = quantity;
    await cart.save();

    const populatedCart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    const total = populatedCart.items.reduce(
      (acc, item) =>
        acc + item.product.price * item.quantity,
      0
    );

    res.json({
      ...populatedCart.toObject(),
      total,
    });

  } catch (error) {
    console.error("🔥 UPDATE CART ERROR");
    console.error(error.message);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ==========================================
   REMOVE ITEM (WITH VARIANT SUPPORT)
========================================== */
const removeCartItem = async (req, res) => {
  try {
    const { productId, size, color } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart)
      return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          item.size === size &&
          item.color === color
        )
    );

    await cart.save();

    const populatedCart = await Cart.findOne({
      user: req.user._id,
    }).populate("items.product");

    const total = populatedCart.items.reduce(
      (acc, item) =>
        acc + item.product.price * item.quantity,
      0
    );

    res.json({
      ...populatedCart.toObject(),
      total,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
module.exports = {
  addToCart,
  getUserCart,
  updateCartItem,
  removeCartItem,
};