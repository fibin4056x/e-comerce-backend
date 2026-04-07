const rateLimiter = require("express-rate-limit");

/* =========================
   COMMON HANDLER
========================= */
const limiterHandler = (req, res) => {
  return res.status(429).json({
    message: "Too many requests, please try again later",
  });
};

/* =========================
   GENERAL API LIMITER
========================= */
const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,

  // Better key generation (works behind proxies)
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"] || "unknown";
  },
});

/* =========================
   AUTH LIMITER (STRICT)
========================= */
const authLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5, // stricter for auth
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many login attempts, please try again later",
    });
  },

  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"] || "unknown";
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};