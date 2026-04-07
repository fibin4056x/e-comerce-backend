const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  getDashboardStats,
  getRecentOrders,
  getTopProducts,
  getMonthlyRevenue,
} = require("../controllers/adminControllerV2");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get("/stats", protect, admin, apiLimiter, asyncHandler(getDashboardStats));
router.get("/recent-orders", protect, admin, apiLimiter, asyncHandler(getRecentOrders));
router.get("/top-products", protect, admin, apiLimiter, asyncHandler(getTopProducts));
router.get("/monthly-revenue", protect, admin, apiLimiter, asyncHandler(getMonthlyRevenue));

module.exports = router;
