const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { protect } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistcontroller");

/* =========================
   ASYNC HANDLER
========================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   VALIDATE OBJECT ID
========================= */
const validateProductId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }
  next();
};

/* =========================
   ROUTES
========================= */

router.get(
  "/",
  protect,
  apiLimiter,
  asyncHandler(getWishlist)
);

router.post(
  "/",
  protect,
  apiLimiter,
  asyncHandler(addToWishlist)
);

router.delete(
  "/:productId",
  protect,
  validateProductId,
  apiLimiter,
  asyncHandler(removeFromWishlist)
);

module.exports = router;