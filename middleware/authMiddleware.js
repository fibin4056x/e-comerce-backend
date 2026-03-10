const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

/* =========================
   PROTECT (ACCESS TOKEN BASED)
========================= */

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      console.log("❌ AUTH: No access token in cookies");
      return res.status(401).json({ message: "Not authorized" });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.log("❌ AUTH: Access token invalid or expired");
      return res.status(401).json({
        message: "Access token expired. Please refresh session.",
      });
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log("❌ AUTH: User not found for token");
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      console.log("❌ AUTH: Unverified account attempt:", user.email);
      return res.status(403).json({ message: "Account not verified" });
    }

    req.user = user;

    console.log("✅ AUTH: Authenticated:", user.email);
    next();

  } catch (error) {
    console.error("🔥 AUTH Middleware Fatal Error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

/* =========================
   ADMIN MIDDLEWARE 
========================= */

const admin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin") {
      console.log("🚫 ADMIN DENIED:", req.user.email);
      return res.status(403).json({ message: "Admin access only" });
    }

    console.log("🛡 ADMIN GRANTED:", req.user.email);
    next();

  } catch (error) {
    console.error("🔥 ADMIN Middleware Error:", error);
    return res.status(500).json({ message: "Authorization error" });
  }
};

module.exports = { protect, admin };