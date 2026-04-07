const express = require("express");
const router = express.Router();

const User = require("../models/userModel");
const upload = require("../middleware/uploadCloudinary");
const cloudinary = require("../config/cloudinary");
const {
  registerUser,
  verifyRegisterOTP,
  loginUser,
  requestLoginOTP,
  verifyLoginOTP,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
} = require("../controllers/authControllerV2");
const {
  validateRegister,
  validateLogin,
  validateEmail,
  validateOTP,
} = require("../middleware/validateUserV2");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { destroyCloudinaryAsset } = require("../utilitis/cloudinaryAsset");

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const toProfileResponse = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage || "",
});

router.post("/register", authLimiter, validateRegister, asyncHandler(registerUser));
router.post("/verify-register", authLimiter, validateOTP, asyncHandler(verifyRegisterOTP));
router.post("/login", authLimiter, validateLogin, asyncHandler(loginUser));
router.post("/request-login-otp", authLimiter, validateEmail, asyncHandler(requestLoginOTP));
router.post("/verify-login-otp", authLimiter, validateOTP, asyncHandler(verifyLoginOTP));
router.post("/refresh", asyncHandler(refreshAccessToken));
router.post("/logout", asyncHandler(logoutUser));
router.get("/profile", protect, asyncHandler(getUserProfile));

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

    if (user.profileImage) {
      await destroyCloudinaryAsset(cloudinary, user.profileImage).catch(() => false);
    }

    user.profileImage = req.file.path;
    await user.save();

    return res.json(toProfileResponse(user));
  })
);

router.delete(
  "/profile-image",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profileImage) {
      await destroyCloudinaryAsset(cloudinary, user.profileImage).catch(() => false);
    }

    user.profileImage = "";
    await user.save();

    return res.json(toProfileResponse(user));
  })
);

module.exports = router;
