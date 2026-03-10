const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");

const {
  createOrder,
  getmyOrders,
  getAllOrders,
  cancelOrder,
  markDelivered
} = require("../controllers/orderController");

 
/* USER ROUTES */

router.post("/", protect, createOrder);

router.get("/my", protect, getmyOrders);

router.put("/:id/cancel", protect, cancelOrder);


/* ADMIN ROUTES */

router.get("/admin", protect, admin, getAllOrders);

router.put("/:id/deliver", protect, admin, markDelivered);


module.exports = router;