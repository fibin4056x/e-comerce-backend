const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const upload = require("../middleware/uploadCloudinary");

const {
  getProducts,
  getProductsbyId,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  updateProductReview,
  deleteProductReview,
} = require("../controllers/productController");

const { protect, admin } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");

/* =========================
   ASYNC HANDLER
========================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   PARAM VALIDATION
========================= */
const validateObjectId = (param) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
    return res.status(400).json({ message: `Invalid ${param}` });
  }
  next();
};

/* =========================
   PRODUCTS
========================= */

// GET all products (public)
router.get("/", apiLimiter, asyncHandler(getProducts));

// GET single product (public)
router.get("/:id", validateObjectId("id"), apiLimiter, asyncHandler(getProductsbyId));

// CREATE product (admin only)
router.post(
  "/",
  protect,
  admin,
  apiLimiter,
  upload.array("images", 5),
  asyncHandler(createProduct)
);

// UPDATE product (admin only)
router.put(
  "/:id",
  protect,
  admin,
  validateObjectId("id"),
  apiLimiter,
  upload.array("images", 5),
  asyncHandler(updateProduct)
);

// DELETE product (admin only)
router.delete(
  "/:id",
  protect,
  admin,
  validateObjectId("id"),
  apiLimiter,
  asyncHandler(deleteProduct)
);

/* =========================
   REVIEWS
========================= */

// ADD review
router.post(
  "/:id/reviews",
  protect,
  validateObjectId("id"),
  apiLimiter,
  asyncHandler(addProductReview)
);

// UPDATE review
router.put(
  "/:id/reviews/:reviewId",
  protect,
  validateObjectId("id"),
  validateObjectId("reviewId"),
  apiLimiter,
  asyncHandler(updateProductReview)
);

// DELETE review
router.delete(
  "/:id/reviews/:reviewId",
  protect,
  validateObjectId("id"),
  validateObjectId("reviewId"),
  apiLimiter,
  asyncHandler(deleteProductReview)
);

module.exports = router;