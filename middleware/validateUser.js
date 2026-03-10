const { body, validationResult } = require("express-validator");

/* =========================
   CENTRAL ERROR HANDLER
========================= */

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    console.log("❌ VALIDATION ERROR:", formatted);

    return res.status(400).json({
      message: formatted[0].message,
      errors: formatted
    });
  }

  next();
};

/* =========================
   REGISTER VALIDATION
========================= */

const validateRegister = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 4, max: 30 })
    .withMessage("Username must be 4–30 characters")
    .isAlphanumeric()
    .withMessage("Username can only contain letters and numbers")
    ,

  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format")
    .isLength({ max: 100 }),

  body("password")
    .trim()
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6, max: 50 })
    .withMessage("Password must be 6–50 characters")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*]/)
    .withMessage("Password must contain a special character"),

  handleValidation
];

/* =========================
   PASSWORD LOGIN VALIDATION
========================= */

const validateLogin = [
  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),

  body("password")
    .trim()
    .notEmpty().withMessage("Password is required"),

  handleValidation
];

/* =========================
   OTP VALIDATION
========================= */

const validateOTP = [
  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),

  body("otp")
    .trim()
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),

  handleValidation
];

module.exports = {
  validateRegister,
  validateLogin,
  validateOTP
};