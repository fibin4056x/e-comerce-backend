const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utilitis/sendemail.js");

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getCookieOptions = (maxAge) => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, getCookieOptions(ACCESS_TOKEN_TTL_MS));
  res.cookie("refreshToken", refreshToken, getCookieOptions(REFRESH_TOKEN_TTL_MS));
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", getCookieOptions());
  res.clearCookie("refreshToken", getCookieOptions());
};

const clearOtpState = (user) => {
  user.otp = null;
  user.otpExpires = null;
  user.otpAttempts = 0;
};

const setOtpState = async (user, otp) => {
  user.otp = await user.hashOTP(otp);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
};

const getSafeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage || "",
});

const validateOtpAttempt = async (user, otp) => {
  if (!user || !user.otp || !user.otpExpires) {
    return { ok: false, statusCode: 400, message: "Invalid OTP" };
  }

  if (user.otpExpires.getTime() < Date.now()) {
    clearOtpState(user);
    await user.save();
    return { ok: false, statusCode: 400, message: "OTP expired" };
  }

  const isValid = await user.verifyOTP(otp);
  if (isValid) {
    return { ok: true };
  }

  user.otpAttempts = (user.otpAttempts || 0) + 1;

  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    clearOtpState(user);
    await user.save();
    return {
      ok: false,
      statusCode: 429,
      message: "Too many invalid OTP attempts. Request a new OTP.",
    };
  }

  await user.save();
  return { ok: false, statusCode: 400, message: "Invalid OTP" };
};

const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: "All fields required" });
    }

    let user = await User.findOne({ email });

    if (user?.isVerified) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const otp = generateOTP();

    if (!user) {
      user = new User({
        username,
        email,
        password,
        isVerified: false,
      });
    } else {
      user.username = username;
      user.password = password;
      user.isVerified = false;
    }

    await setOtpState(user, otp);
    await user.save();

    await sendEmail(
      email,
      "Your OTP for Registration",
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );

    return res.json({ message: "OTP sent to email" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Server Error",
    });
  }
};

const verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    const otpResult = await validateOtpAttempt(user, otp);
    if (!otpResult.ok) {
      return res
        .status(otpResult.statusCode)
        .json({ message: otpResult.message });
    }

    user.isVerified = true;
    clearOtpState(user);
    await user.save();

    return res.json({ message: "Account verified" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been suspended" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Verify your account first" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = hashToken(refreshToken);
    clearOtpState(user);
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      message: "Login successful",
      user: getSafeUser(user),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Server Error",
    });
  }
};

const requestLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been suspended" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Verify your account first" });
    }

    const otp = generateOTP();
    await setOtpState(user, otp);
    await user.save();

    await sendEmail(
      email,
      "Your Login OTP",
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );

    return res.json({ message: "OTP sent to email" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Server Error",
    });
  }
};

const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been suspended" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Verify your account first" });
    }

    const otpResult = await validateOtpAttempt(user, otp);
    if (!otpResult.ok) {
      return res
        .status(otpResult.statusCode)
        .json({ message: otpResult.message });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = hashToken(refreshToken);
    clearOtpState(user);
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      message: "Login successful (OTP)",
      user: getSafeUser(user),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Server Error",
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid token" });
    }

    if (user.isBanned) {
      clearAuthCookies(res);
      return res.status(403).json({ message: "Account has been suspended" });
    }

    if (user.refreshToken !== hashToken(token)) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Invalid token" });
    }

    const newAccessToken = generateAccessToken(user._id);
    res.cookie("accessToken", newAccessToken, getCookieOptions(ACCESS_TOKEN_TTL_MS));

    return res.json({ message: "Token refreshed" });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const logoutUser = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (user && user.refreshToken === hashToken(token)) {
          user.refreshToken = null;
          await user.save();
        }
      } catch (error) {
        // Ignore invalid refresh tokens during logout
      }
    }

    clearAuthCookies(res);
    return res.json({ message: "Logged out" });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(getSafeUser(user));
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
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
