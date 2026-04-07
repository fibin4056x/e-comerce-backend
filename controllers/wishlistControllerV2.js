const mongoose = require("mongoose");
const Wishlist = require("../models/wishlistModel");
const Product = require("../models/productModel");

const buildWishlistResponse = async (userId) => {
  const wishlist = await Wishlist.findOne({ user: userId }).populate("products").lean();
  return wishlist?.products || [];
};

const getWishlist = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.json(await buildWishlistResponse(req.user._id));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const addToWishlist = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Valid product ID required" });
    }

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { products: productId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json(await buildWishlistResponse(req.user._id));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: productId } }
    );

    return res.json(await buildWishlistResponse(req.user._id));
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
