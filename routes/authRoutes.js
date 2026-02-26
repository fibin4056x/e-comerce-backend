const express = require("express");
const router = express.Router();

const {
  registerUser,
  verifyRegisterOTP,
  loginUser,
  requestLoginOTP,
  verifyLoginOTP,
  logoutUser,
  getUserProfile,
} = require("../controllers/authController");

const {
  validateRegister,
  validateLogin,
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
router.post("/request-login-otp", validateLogin, requestLoginOTP);

/* =========================
   VERIFY LOGIN OTP
========================= */
router.post("/verify-login-otp", validateOTP, verifyLoginOTP);

/* =========================
   LOGOUT
========================= */
router.post("/logout", logoutUser);

/* =========================
   PROFILE (PROTECTED)
========================= */
router.get("/profile", protect, getUserProfile);

module.exports = router;