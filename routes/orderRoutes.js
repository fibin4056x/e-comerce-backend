const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { protect, admin } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");

const {
  createOrder,
  getmyOrders,
  getAllOrders,
  cancelOrder,
  markDelivered
} = require("../controllers/orderController");

/* =========================
   ASYNC HANDLER
========================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   VALIDATE OBJECT ID
========================= */
const validateOrderId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid order ID" });
  }
  next();
};

/* =========================
   USER ROUTES
========================= */

router.post(
  "/",
  protect,
  apiLimiter,
  asyncHandler(createOrder)
);

router.get(
  "/my",
  protect,
  apiLimiter,
  asyncHandler(getmyOrders)
);

router.put(
  "/:id/cancel",
  protect,
  validateOrderId,
  apiLimiter,
  asyncHandler(cancelOrder)
);

/* =========================
   ADMIN ROUTES
========================= */

router.get(
  "/admin",
  protect,
  admin,
  apiLimiter,
  asyncHandler(getAllOrders)
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