const express = require("express");
const router = express.Router();

const User = require("../models/userModel");
const upload = require("../middleware/uploadCloudinary");

const {
  registerUser,
  verifyRegisterOTP,
  loginUser,
  requestLoginOTP,
  verifyLoginOTP,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
} = require("../controllers/authController");

const {
  validateRegister,
  validateLogin,
  validateEmail,
  validateOTP
} = require("../middleware/validateUser");

const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

/* =========================
   ASYNC HANDLER
========================= */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/* =========================
   REGISTER
========================= */
router.post("/register", authLimiter, validateRegister, asyncHandler(registerUser));

/* =========================
   VERIFY REGISTRATION OTP
========================= */
router.post("/verify-register", authLimiter, validateOTP, asyncHandler(verifyRegisterOTP));

/* =========================
   PASSWORD LOGIN
========================= */
router.post("/login", authLimiter, validateLogin, asyncHandler(loginUser));

/* =========================
   REQUEST LOGIN OTP
========================= */
router.post("/request-login-otp", authLimiter, validateEmail, asyncHandler(requestLoginOTP));

/* =========================
   VERIFY LOGIN OTP
========================= */
router.post("/verify-login-otp", authLimiter, validateOTP, asyncHandler(verifyLoginOTP));

/* =========================
   REFRESH ACCESS TOKEN
========================= */
router.post("/refresh", asyncHandler(refreshAccessToken));

/* =========================
   LOGOUT
========================= */
router.post("/logout", asyncHandler(logoutUser));

/* =========================
   PROFILE
========================= */
router.get("/profile", protect, asyncHandler(getUserProfile));

/* =========================
   PROFILE IMAGE (CLOUDINARY SAFE)
========================= */
router.put(
  "/profile-image",
  protect,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Cloudinary URL
    user.profileImage = req.file.path;

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    });
  })
);

/* =========================
   DELETE PROFILE IMAGE
========================= */
router.delete(
  "/profile-image",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // NOTE: Cloudinary deletion should be handled using public_id
    // Skipping here to avoid breaking your current structure

    user.profileImage = null;
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: null,
    });
  })
);

module.exports = router;