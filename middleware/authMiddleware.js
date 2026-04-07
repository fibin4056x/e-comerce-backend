const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/userModel");

/* =========================
   PROTECT (ACCESS TOKEN BASED)
========================= */

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Access token expired. Please refresh session.",
        });
      }

      return res.status(401).json({ message: "Invalid access token" });
    }

    if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(decoded.id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been suspended" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Account not verified" });
    }

    req.user = user;

    next();

  } catch (error) {
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

    if (String(req.user.role).toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    next();

  } catch (error) {
    return res.status(500).json({ message: "Authorization error" });
  }
};

module.exports = { protect, admin };
