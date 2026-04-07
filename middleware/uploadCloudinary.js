const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const resolveFolder = (req) => {
  if (req.baseUrl?.includes("/auth")) {
    return "users/profile-images";
  }

  return "products";
};

/* =========================
   STORAGE CONFIG
========================= */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: resolveFolder(req),
      format: "webp",
      transformation: [{ quality: "auto" }],
    };
  },
});

/* =========================
   FILE FILTER (SECURITY)
========================= */
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"), false);
  }

  cb(null, true);
};

/* =========================
   MULTER INSTANCE
========================= */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 5,
  },
});

module.exports = upload;
