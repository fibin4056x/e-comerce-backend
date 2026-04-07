const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { protect } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  addToCart,
  getUserCart,
  updateCartItem,
  removeCartItem,
} = require("../controllers/cartControllerV2");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validateCartParams = (req, res, next) => {
  const { productId, size, color } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  if (!size || !color) {
    return res.status(400).json({ message: "Invalid variant data" });
  }

  next();
};

router.post("/", protect, apiLimiter, asyncHandler(addToCart));
router.get("/", protect, apiLimiter, asyncHandler(getUserCart));
router.put("/", protect, apiLimiter, asyncHandler(updateCartItem));
router.delete(
  "/:productId/:size/:color",
  protect,
  validateCartParams,
  apiLimiter,
  asyncHandler(removeCartItem)
);

module.exports = router;
