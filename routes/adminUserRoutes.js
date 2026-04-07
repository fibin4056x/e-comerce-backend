const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const {
  getAllUsers,
  updateUserRole,
  toggleBan,
  deleteUser
} = require("../controllers/adminUserController");

const { protect, admin } = require("../middleware/authMiddleware");
const { apiLimiter } = require("../middleware/rateLimiter");

/* =========================
   ASYNC HANDLER
========================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   VALIDATE OBJECT ID
========================= */
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  next();
};

/* =========================
   PREVENT SELF ACTION
========================= */
const preventSelfAction = (req, res, next) => {
  if (req.user && String(req.user._id) === req.params.id) {
    return res.status(400).json({
      message: "You cannot perform this action on yourself"
    });
  }
  next();
};

/* =========================
   ROUTES
========================= */

router.get(
  "/users",
  protect,
  admin,
  apiLimiter,
  asyncHandler(getAllUsers)
);

router.patch(
  "/users/:id/role",
  protect,
  admin,
  validateObjectId,
  preventSelfAction,
  apiLimiter,
  asyncHandler(updateUserRole)
);

router.patch(
  "/users/:id/ban",
  protect,
  admin,
  validateObjectId,
  preventSelfAction,
  apiLimiter,
  asyncHandler(toggleBan)
);

router.delete(
  "/users/:id",
  protect,
  admin,
  validateObjectId,
  preventSelfAction,
  apiLimiter,
  asyncHandler(deleteUser)
);

module.exports = router;