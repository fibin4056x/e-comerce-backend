const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  addToCart,
  getUserCart,
  updateCartItem,
  removeCartItem,
} = require("../controllers/cartController");

router.post("/", protect, addToCart);
router.get("/", protect, getUserCart);
router.put("/", protect, updateCartItem);
router.delete("/:productId/:size/:color", protect, removeCartItem);

module.exports = router;