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
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
};

/* =========================
   OTP GENERATOR
========================= */

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/* =========================
   SET COOKIES
========================= */

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

/* =========================
   REGISTER (SEND OTP)
========================= */

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

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

    console.log("OTP:", otp); // 🔥 TEMP (since no email setup)

    res.json({ message: "OTP sent (check console)" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    console.log("LOGIN OTP:", otp); // 🔥 TEMP

    res.json({ message: "OTP sent (check console)" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    res.json({ message: "Login successful (OTP)" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    const hashed = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    if (!user || user.refreshToken !== hashed) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const newAccessToken = generateAccessToken(user._id);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.json({ message: "Token refreshed" });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

/* =========================
   LOGOUT
========================= */

const logoutUser = async (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });

  res.json({ message: "Logged out" });
};

/* =========================
   PROFILE
========================= */

const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
  });
};

/* =========================
   EXPORT
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