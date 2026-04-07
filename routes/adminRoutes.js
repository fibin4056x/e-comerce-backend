const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");

/* OPTIONAL but recommended */
const { apiLimiter } = require("../middleware/rateLimiter");

const {
  getDashboardStats,
  getRecentOrders,
  getTopProducts,
  getMonthlyRevenue
} = require("../controllers/adminController");

/* =========================
   SAFE ASYNC WRAPPER
========================= */

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   ADMIN DASHBOARD 
========================= */

router.get(
  "/stats",
  protect,
  admin,
  apiLimiter,
  asyncHandler(getDashboardStats)
);

router.get(
  "/recent-orders",
  protect,
  admin,
  apiLimiter,
  asyncHandler(getRecentOrders)
);

router.get(
  "/top-products",
  protect,
  admin,
  apiLimiter,
  asyncHandler(getTopProducts)
);

router.get(
  "/monthly-revenue",
  protect,
  admin,
  apiLimiter,
  asyncHandler(getMonthlyRevenue)
);

module.exports = router;