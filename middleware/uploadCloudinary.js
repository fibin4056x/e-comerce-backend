const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const appRoot = path.resolve(__dirname, "..");
const uploadsRoot = path.join(appRoot, "uploads");
const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_SECRET
);

const resolveFolder = (req) => {
  if (req.baseUrl?.includes("/auth")) {
    return "users/profile-images";
  }

  return "products";
};

/* =========================
   STORAGE CONFIG
========================= */
const ensureUploadDirectory = (folder) => {
  const directory = path.join(uploadsRoot, folder);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const storage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary,
      params: async (req) => {
        return {
          folder: resolveFolder(req),
          format: "webp",
          transformation: [{ quality: "auto" }],
        };
      },
    })
  : multer.diskStorage({
      destination: (req, file, cb) => {
        try {
          cb(null, ensureUploadDirectory(resolveFolder(req)));
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
        const safeExtension = [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
          ? extension
          : ".jpg";

        cb(
          null,
          `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`
        );
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
