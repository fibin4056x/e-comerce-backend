const Wishlist = require("../models/wishlistModel");
const mongoose = require("mongoose");

/* ==========================================
   GET USER WISHLIST
========================================== */
const getWishlist = async (req, res) => {
  try {
    console.log("📦 Fetching wishlist for:", req.user._id);

    const wishlist = await Wishlist.findOne({
      user: req.user._id,
    }).populate("products");

    if (!wishlist) {
      console.log("⚠ No wishlist found, returning empty array");
      return res.json([]);
    }

    console.log("✅ Wishlist count:", wishlist.products.length);

    res.json(wishlist.products);
  } catch (error) {
    console.error("🔥 Wishlist Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   ADD TO WISHLIST
========================================== */
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    console.log("❤️ Add wishlist request:", productId);

    if (!productId) {
      return res.status(400).json({
        message: "Product ID required",
      });
    }

    let wishlist = await Wishlist.findOne({
      user: req.user._id,
    });

    // Convert to ObjectId
    const objectId = new mongoose.Types.ObjectId(productId);

    if (!wishlist) {
      console.log("🆕 Creating new wishlist");
      wishlist = await Wishlist.create({
        user: req.user._id,
        products: [objectId],
      });
    } else {
      const alreadyExists = wishlist.products.some(
        (p) => p.toString() === productId
      );

      if (alreadyExists) {
        console.log("⚠ Product already in wishlist");
      } else {
        wishlist.products.push(objectId);
        await wishlist.save();
        console.log("✅ Product added to wishlist");
      }
    }

    const populated = await Wishlist.findOne({
      user: req.user._id,
    }).populate("products");

    console.log("📦 Updated wishlist count:", populated.products.length);

    res.json(populated.products);

  } catch (error) {
    console.error("🔥 Wishlist Add Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   REMOVE FROM WISHLIST
========================================== */
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    console.log("❌ Remove wishlist request:", productId);

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

    console.log("📦 Wishlist after removal:", populated.products.length);

    res.json(populated.products);

  } catch (error) {
    console.error("🔥 Wishlist Remove Error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};