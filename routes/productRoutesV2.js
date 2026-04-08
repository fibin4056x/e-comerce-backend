const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const upload = require("../middleware/uploadCloudinary");
const {
  getProducts,
  getProductsById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  updateProductReview,
  deleteProductReview,
} = require("../controllers/productControllerV2");
const { protect, admin, attachUserIfPresent } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validateObjectId = (param) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
    return res.status(400).json({ message: `Invalid ${param}` });
  }

  next();
};

router.get("/", attachUserIfPresent, apiLimiter, asyncHandler(getProducts));
router.get("/:id", attachUserIfPresent, validateObjectId("id"), apiLimiter, asyncHandler(getProductsById));

router.post(
  "/",
  protect,
  admin,
  apiLimiter,
  upload.array("images", 5),
  asyncHandler(createProduct)
);

router.put(
  "/:id",
  protect,
  admin,
  validateObjectId("id"),
  apiLimiter,
  upload.array("images", 5),
  asyncHandler(updateProduct)
);

router.delete(
  "/:id",
  protect,
  admin,
  validateObjectId("id"),
  apiLimiter,
  asyncHandler(deleteProduct)
);

router.post(
  "/:id/reviews",
  protect,
  validateObjectId("id"),
  apiLimiter,
  asyncHandler(addProductReview)
);

router.put(
  "/:id/reviews/:reviewId",
  protect,
  validateObjectId("id"),
  validateObjectId("reviewId"),
  apiLimiter,
  asyncHandler(updateProductReview)
);

router.delete(
  "/:id/reviews/:reviewId",
  protect,
  validateObjectId("id"),
  validateObjectId("reviewId"),
  apiLimiter,
  asyncHandler(deleteProductReview)
);

module.exports = router;
