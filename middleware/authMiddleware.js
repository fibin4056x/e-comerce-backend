const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/userModel");

const getAccessToken = (req) => req.cookies?.accessToken;

const verifyAccessToken = (token) => {
  if (!token) {
    return { status: 401, message: "Not authorized" };
  }

  try {
    return { decoded: jwt.verify(token, process.env.JWT_SECRET) };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return {
        status: 401,
        message: "Access token expired. Please refresh session.",
      };
    }

    return { status: 401, message: "Invalid access token" };
  }
};

const loadAuthorizedUser = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { status: 401, message: "Invalid token payload" };
  }

  const user = await User.findById(userId).select("-password").lean();

  if (!user) {
    return { status: 401, message: "User not found" };
  }

  if (user.isBanned) {
    return { status: 403, message: "Account has been suspended" };
  }

  if (!user.isVerified) {
    return { status: 403, message: "Account not verified" };
  }

  return { user };
};

/* =========================
   PROTECT (ACCESS TOKEN BASED)
========================= */

const protect = async (req, res, next) => {
  try {
    const tokenResult = verifyAccessToken(getAccessToken(req));
    if (tokenResult.status) {
      return res.status(tokenResult.status).json({ message: tokenResult.message });
    }

    const userResult = await loadAuthorizedUser(tokenResult.decoded.id);
    if (userResult.status) {
      return res.status(userResult.status).json({ message: userResult.message });
    }

    req.user = userResult.user;

    next();

  } catch (error) {
    return res.status(500).json({ message: "Authentication error" });
  }
};

const attachUserIfPresent = async (req, res, next) => {
  const token = getAccessToken(req);

  if (!token) {
    return next();
  }

  try {
    const tokenResult = verifyAccessToken(token);
    if (tokenResult.status) {
      return next();
    }

    const userResult = await loadAuthorizedUser(tokenResult.decoded.id);
    if (userResult.user) {
      req.user = userResult.user;
    }
  } catch {
    // Keep public routes accessible even if the session cookie is stale.
  }

  return next();
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

module.exports = { protect, admin, attachUserIfPresent };
