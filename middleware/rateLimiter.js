const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

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
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterHandler,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
});

/* =========================
   AUTH LIMITER (STRICT)
========================= */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    return res.status(429).json({
      message: "Too many login attempts, please try again later",
    });
  },
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "anonymous";

    return `${ipKeyGenerator(req.ip || "unknown")}:${email}`;
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
