const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/* =========================
   GENERATE JWT COOKIE
========================= */

const generateToken = (res, id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

/* =========================
   GENERATE 6 DIGIT OTP
========================= */

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/* =========================
   REGISTER
========================= */

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log("📩 REGISTER:", email);

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = generateOTP();

    const user = await User.create({
      username,
      email,
      password,
      isVerified: false,
      otpAttempts: 0,
    });

    user.otp = await user.hashOTP(otp);
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    console.log("🔐 REGISTER OTP:", otp);

    res.status(201).json({
      message: "Registration successful. Verify OTP.",
    });

  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   VERIFY REGISTRATION OTP
========================= */

const verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otpAttempts >= 5) {
      return res.status(403).json({ message: "Too many failed attempts" });
    }

    const valid = await user.verifyOTP(otp);

    if (!valid) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    generateToken(res, user._id);

    res.json({
      message: "Account verified",
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

  } catch (error) {
    console.error("❌ VERIFY REGISTER OTP ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   LOGIN (PASSWORD)
========================= */

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔑 LOGIN:", email);

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    generateToken(res, user._id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   REQUEST LOGIN OTP
========================= */

const requestLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    const otp = generateOTP();

    user.otp = await user.hashOTP(otp);
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.otpAttempts = 0;
    await user.save();

    console.log("🔐 LOGIN OTP:", otp);

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("❌ REQUEST LOGIN OTP ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   VERIFY LOGIN OTP
========================= */

const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user.otp) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otpAttempts >= 5) {
      return res.status(403).json({ message: "Too many failed attempts" });
    }

    const valid = await user.verifyOTP(otp);

    if (!valid) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    await user.save();

    generateToken(res, user._id);

    res.json({
      message: "Login successful",
      _id: user._id,
      username: user.username,
      role: user.role,
    });

  } catch (error) {
    console.error("❌ VERIFY LOGIN OTP ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   LOGOUT
========================= */

const logoutUser = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({ message: "Logged out successfully" });
};

/* =========================
   GET PROFILE
========================= */

const getUserProfile = async (req, res) => {
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
  });
};

module.exports = {
  registerUser,
  verifyRegisterOTP,
  loginUser,
  requestLoginOTP,
  verifyLoginOTP,
  logoutUser,
  getUserProfile,
};