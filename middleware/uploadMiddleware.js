const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log("📁 Upload folder created");
}

// Storage config
const storage = multer.diskStorage({
  destination(req, file, cb) {
    console.log("📦 Uploading file to:", uploadPath);
    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    console.log("📝 Saving file as:", uniqueName);
    cb(null, uniqueName);
  },
});

// File filter  with proper error handling
function checkFileType(file, cb) {
  const allowedTypes = /jpg|jpeg|png|webp/;

  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    console.log("✅ File type accepted:", file.originalname);
    return cb(null, true);
  } else {
    console.error("❌ Invalid file type:", file.originalname);
    cb(new Error("Only JPG, JPEG, PNG, WEBP images are allowed"));
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
});

module.exports = upload;