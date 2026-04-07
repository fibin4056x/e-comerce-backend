const { body, validationResult } = require("express-validator");

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    return res.status(400).json({
      message: formatted[0].message,
      errors: formatted,
    });
  }

  next();
};

const validateRegister = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .bail()
    .isLength({ min: 4, max: 30 })
    .withMessage("Username must be 4-30 characters")
    .bail()
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .toLowerCase(),

  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Invalid email format")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Email must not exceed 100 characters"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be 6-128 characters")
    .bail()
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .bail()
    .matches(/[!@#$%^&*]/)
    .withMessage("Password must contain a special character")
    .bail()
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter")
    .bail()
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter"),

  handleValidation,
];

const validateEmail = [
  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Invalid email format"),

  handleValidation,
];

const validateLogin = [
  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Invalid email format"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),

  handleValidation,
];

const validateOTP = [
  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Invalid email format"),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .bail()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .bail()
    .matches(/^\d{6}$/)
    .withMessage("OTP must be exactly 6 digits"),

  handleValidation,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateEmail,
  validateOTP,
};
