const express = require("express");
const router = express.Router();
const User=require("../models/userModel");
const upload = require("../middleware/uploadMiddleware");
const fs = require("fs");
const path = require("path");
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

/* =========================
   REGISTER
========================= */
router.post("/register", validateRegister, registerUser);

/* =========================
   VERIFY REGISTRATION OTP
========================= */
router.post("/verify-register", validateOTP, verifyRegisterOTP);

/* =========================
   PASSWORD LOGIN
========================= */
router.post("/login", validateLogin, loginUser);

/* =========================
   REQUEST LOGIN OTP
========================= */
router.post("/request-login-otp", validateEmail, requestLoginOTP);

/* =========================
   VERIFY LOGIN OTP
========================= */
router.post("/verify-login-otp", validateOTP, verifyLoginOTP);

/* =========================
   REFRESH ACCESS TOKEN
========================= */
router.post("/refresh", refreshAccessToken);

/* =========================
   LOGOUT
========================= */
router.post("/logout", logoutUser);

/* =========================
   PROFILE (PROTECTED) 
========================= */
router.get("/profile", protect, getUserProfile);
router.put(
  "/profile-image",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const user = await User.findById(req.user.id);

      user.profileImage = `/uploads/${req.file.filename}`;
      await user.save();

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      });

    } catch (err) {
      res.status(500).json({ message: "Upload failed" });
    }
  }
);
router.delete(
  "/profile-image",
  protect,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (user.profileImage) {
        const filePath = path.join(
          __dirname,
          "../uploads",
          user.profileImage.split("/").pop()
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      user.profileImage = null;
      await user.save();

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: null,
      });

    } catch (err) {
      res.status(500).json({ message: "Delete failed" });
    }
  }
);
module.exports = router;