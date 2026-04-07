const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utilitis/sendemail.js");

/* =========================
   TOKEN GENERATORS
========================= */

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });

/* =========================
   OTP GENERATOR
========================= */

const generateOTP = () =>
  crypto.randomInt(100000, 999999).toString();

/* =========================
   SET COOKIES
========================= */

const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "lax",
    path: "/",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

/* =========================
   REGISTER (SEND OTP)
========================= */

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: "All fields required" });
    }

    let user = await User.findOne({ email });
    const otp = generateOTP();

    if (user) {
      user.otp = otp;
      user.otpExpires = Date.now() + 5 * 60 * 1000;
      await user.save();
    } else {
      user = await User.create({
        username,
        email,
        password,
        otp,
        otpExpires: Date.now() + 5 * 60 * 1000,
        isVerified: false,
      });
    }

    await sendEmail(
      email,
      "Your OTP for Registration",
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );

    res.json({ message: "OTP sent to email" });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =========================
   VERIFY REGISTER OTP
========================= */

const verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.json({ message: "Account verified" });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =========================
   LOGIN (PASSWORD)
========================= */

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Verify your account first" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch {
    res.status(500).json({ message: "Server Error" });
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

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;

    await user.save();

    await sendEmail(
      email,
      "Your Login OTP",
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );

    res.json({ message: "OTP sent to email" });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =========================
   VERIFY LOGIN OTP
========================= */

const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    user.otp = null;
    user.otpExpires = null;

    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: "Login successful (OTP)",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* =========================
   REFRESH TOKEN
========================= */

const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const hashed = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    if (user.refreshToken !== hashed) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const newAccessToken = generateAccessToken(user._id);

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "lax",
      path: "/",
    });

    res.json({ message: "Token refreshed" });

  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

/* =========================
   LOGOUT
========================= */

const logoutUser = async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "lax",
    path: "/",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "lax",
    path: "/",
  });

  res.json({ message: "Logged out" });
};

/* =========================
   PROFILE
========================= */

const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  });
};

/* =========================
   EXPORT (UNCHANGED)
========================= */

module.exports = {
  registerUser,
  verifyRegisterOTP,
  loginUser,
  requestLoginOTP,
  verifyLoginOTP,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
};