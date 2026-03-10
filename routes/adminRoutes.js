const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");

const {
  getDashboardStats,
  getRecentOrders,
  getTopProducts,
  getMonthlyRevenue
} = require("../controllers/adminController");

/* =========================
   ADMIN DASHBOARD 
========================= */

router.get("/stats", protect, admin, getDashboardStats);

router.get("/recent-orders", protect, admin, getRecentOrders);

router.get("/top-products", protect, admin, getTopProducts);

router.get("/monthly-revenue", protect, admin, getMonthlyRevenue);

module.exports = router;