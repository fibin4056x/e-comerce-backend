const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");

/* =========================
   TOKEN GENERATORS
========================= */

const generateAccessToken = (id) => {
  if(!process.env.JWT_SECRET){
    throw new Error("jwt_secret is not defined")
  }
  console.log("Generating access token for:", id);

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (id) => {

  if(process.env.NODE_ENV!=="production"){
    throw new Error("jwt_refresh-secret is not defined")}
  console.log("Generating refresh token for:", id);

  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
};

/* =========================
   SET COOKIES
========================= */

const setAuthCookies = (res, accessToken, refreshToken) => {

  if (process.env.NODE_ENV !== "production") {
  console.log("Setting cookies");
}
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
   sameSite: "None",
   secure: true,
    maxAge: 15 * 60 * 1000,
    path:"/"
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    
  sameSite: "None",
secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path:"/"
  });

};

/* =========================
   GENERATE OTP
========================= */

const generateOTP = () => {

  const otp = crypto.randomInt(100000, 1000000).toString();

  if (process.env.NODE_ENV !== "production") {
    console.log("Generated OTP:", otp);
  }

  return otp;
};;

/* =========================
   REGISTER
========================= */

const registerUser = async (req, res) => {

  try {

    console.log("REGISTER BODY:", req.body);

    const { username, email, password } = req.body;
    
    const otp = generateOTP();

    const user = await User.create({
      username,
      email,
      password,
      isVerified: false,
      otpAttempts: 0,
    });
     if(process.env.NODE_ENV !== "production"){
      console.log("User created :", user._id);
     }


    console.log("REGISTER OTP:", otp);

    res.status(201).json({
      message: "Registration successful. Verify OTP.",
    });

  } catch (err) {
 if (err.code === 11000) {
      return res.status(400).json({ message: "Email already registered" });
    }
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: err.message });

  }

};

/* =========================
   VERIFY REGISTER OTP
========================= */

const verifyRegisterOTP = async (req, res) => {

  try {

   if (process.env.NODE_ENV !== "production") {
  console.log("VERIFY REGISTER OTP:", req.body.email);
}

    const { email, otp } = req.body;
if(!email || !otp||otp.length !==6){
  return res.status(400).json({message :"Invalid request data"})
}
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });
    if(user.isVerified) return res.status(400).json({message:"User already verufied"})

      if (!user.otp || user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });
    
    if (user.otpAttempts >= 5)
      return res.status(403).json({ message: "Too many attempts" });

    const valid = await user.verifyOTP(otp);

    if (!valid) {

      await User.updateOne(
        { _id: user._id },
        { $inc: { otpAttempts: 1 } }
      );

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
      profileImage: user.profileImage,
    });

  } catch (err) {

    console.error("VERIFY REGISTER OTP ERROR:", err);
    res.status(500).json({ message: err.message });

  }

};

/* =========================
   PASSWORD LOGIN
========================= */

const loginUser = async (req, res) => {

  try {

    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Account not verified" });

    if (user.isBanned)
      return res.status(403).json({
        message: "Your account has been banned by admin",
      });

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
      profileImage: user.profileImage,
    });

  } catch (err) {

    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });

  }

};

/* =========================
   REQUEST LOGIN OTP
========================= */

const requestLoginOTP = async (req, res) => {

  try {

    console.log("REQUEST LOGIN OTP:", req.body);

    const { email } = req.body;
 if(!email)return res.status(400).json({message:"Email is required"})
    
  const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Account not verified" });

    if (user.isBanned)
      return res.status(403).json({
        message: "Your account has been banned by admin",
      });

    const otp = generateOTP();

    user.otp = await user.hashOTP(otp);
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.otpAttempts = 0;

    await user.save();

    console.log("LOGIN OTP:", otp);

    res.json({ message: "OTP sent successfully" });

  } catch (err) {

    console.error("REQUEST LOGIN OTP ERROR:", err);
    res.status(500).json({ message: err.message });

  }

};

/* =========================
   VERIFY LOGIN OTP
========================= */

const verifyLoginOTP = async (req, res) => {
  try {

    const { email, otp } = req.body;

    if (!email || !otp || otp.length !== 6) {
      return res.status(400).json({ message: "Invalid request data" });
    } 

    if (process.env.NODE_ENV !== "production") {
      console.log("VERIFY LOGIN OTP:", email);
    }

    const user = await User.findOne({ email });

    if (!user || !user.otp)
      return res.status(400).json({ message: "Invalid request" });

    if (!user.isVerified)
      return res.status(403).json({ message: "Account not verified" });

    if (user.isBanned)
      return res.status(403).json({
        message: "Your account has been banned by admin",
      });

    if (!user.otpExpires || user.otpExpires < Date.now())
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
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};;

/* =========================
   REFRESH TOKEN
========================= */

const refreshAccessToken = async (req, res) => {

  try {

    console.log("Refresh token request");

    const token = req.cookies.refreshToken;

    if (!token)
      return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ message: "User not found" });

    if (user.isBanned)
      return res.status(403).json({
        message: "Account banned",
      });

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

  } catch (err) {

    console.error("REFRESH TOKEN ERROR:", err);
    res.status(401).json({ message: err.message });

  }

};

/* =========================
   LOGOUT 
========================= */

const logoutUser = async (req, res) => {

  try {

    console.log("Logout request");

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

  } catch (err) {

    console.error("LOGOUT ERROR:", err);
    res.status(500).json({ message: err.message });

  }

};

/* =========================
   PROFILE
========================= */

const getUserProfile = async (req, res) => {

  try {

    console.log("Profile request:", req.user.id);

    const user = await User.findById(req.user.id);

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    });

  } catch (err) {

    console.error("PROFILE ERROR:", err);
    res.status(500).json({ message: err.message });

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