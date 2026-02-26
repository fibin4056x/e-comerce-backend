const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/* =========================
   TOKEN GENERATORS
========================= */

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (id) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not defined");
  }

  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

/* =========================
   GENERATE OTP
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

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
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

    console.log("REGISTER OTP:", otp);

    res.status(201).json({
      message: "Registration successful. Verify OTP.",
    });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   VERIFY REGISTER OTP
========================= */

const verifyRegisterOTP = async (req, res) => {
  console.log("🔥 verifyRegisterOTP controller reached");
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otp || user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    if (user.otpAttempts >= 5)
      return res.status(403).json({ message: "Too many attempts" });

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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: "Account verified",
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   PASSWORD LOGIN
========================= */

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Account not verified" });

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
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

  } catch {
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
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Account not verified" });

    const otp = generateOTP();

    user.otp = await user.hashOTP(otp);
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.otpAttempts = 0;

    await user.save();

    console.log("LOGIN OTP:", otp);

    res.json({ message: "OTP sent successfully" });

  } catch {
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
    if (!user || !user.otp)
      return res.status(400).json({ message: "Invalid request" });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    if (user.otpAttempts >= 5)
      return res.status(403).json({ message: "Too many attempts" });

    const valid = await user.verifyOTP(otp);

    if (!valid) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;

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
      _id: user._id,
      username: user.username,
      role: user.role,
    });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   REFRESH TOKEN
========================= */

const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token)
      return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ message: "User not found" });

    const hashed = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    if (user.refreshToken !== hashed)
      return res.status(401).json({ message: "Invalid refresh token" });

    const newAccessToken = generateAccessToken(user._id);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "Access token refreshed" });

  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

/* =========================
   LOGOUT
========================= */

const logoutUser = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    const hashed = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await User.findOneAndUpdate(
      { refreshToken: hashed },
      { refreshToken: null }
    );
  }

  res.cookie("accessToken", "", { httpOnly: true, expires: new Date(0) });
  res.cookie("refreshToken", "", { httpOnly: true, expires: new Date(0) });

  res.json({ message: "Logged out successfully" });
};

/* =========================
   PROFILE
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
  refreshAccessToken,
  logoutUser,
  getUserProfile,
};