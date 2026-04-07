const Wishlist = require("../models/wishlistModel");
const mongoose = require("mongoose");

/* ==========================================
   GET USER WISHLIST
========================================== */
const getWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const wishlist = await Wishlist.findOne({
      user: req.user._id,
    })
      .populate("products")
      .lean();

    if (!wishlist || !wishlist.products) {
      return res.json([]);
    }

    res.json(wishlist.products);

  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ==========================================
   ADD TO WISHLIST
========================================== */
const addToWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productId } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Valid product ID required",
      });
    }

    let wishlist = await Wishlist.findOne({
      user: req.user._id,
    });

    const objectId = new mongoose.Types.ObjectId(productId);

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [objectId],
      });
    } else {
      const exists = wishlist.products.some(
        (p) => p.toString() === productId
      );

      if (!exists) {
        wishlist.products.push(objectId);
        await wishlist.save();
      }
    }

    const populated = await Wishlist.findOne({
      user: req.user._id,
    }).populate("products");

    res.json(populated?.products || []);

  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ==========================================
   REMOVE FROM WISHLIST
========================================== */
const removeFromWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const wishlist = await Wishlist.findOne({
      user: req.user._id,
    });

    if (!wishlist) {
      return res.status(404).json({
        message: "Wishlist not found",
      });
    }

    wishlist.products = wishlist.products.filter(
      (p) => p.toString() !== productId
    );

    await wishlist.save();

    const populated = await Wishlist.findOne({
      user: req.user._id,
    }).populate("products");

    res.json(populated?.products || []);

  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};