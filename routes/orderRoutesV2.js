const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { protect, admin } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  markDelivered,
} = require("../controllers/orderControllerV2");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const validateOrderId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid order ID" });
  }

  next();
};

router.post("/", protect, apiLimiter, asyncHandler(createOrder));
router.get("/my", protect, apiLimiter, asyncHandler(getMyOrders));
router.put("/:id/cancel", protect, validateOrderId, apiLimiter, asyncHandler(cancelOrder));

router.get("/admin", protect, admin, apiLimiter, asyncHandler(getAllOrders));
router.put(
  "/:id/status",
  protect,
  admin,
  validateOrderId,
  apiLimiter,
  asyncHandler(updateOrderStatus)
);
router.put(
  "/:id/deliver",
  protect,
  admin,
  validateOrderId,
  apiLimiter,
  asyncHandler(markDelivered)
);

module.exports = router;
