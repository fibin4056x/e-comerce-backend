const fs = require("fs/promises");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const uploadsRoot = path.join(appRoot, "uploads");

const normalizeSlashes = (value) => String(value || "").replace(/\\/g, "/");

const toPublicAssetPath = (assetPath) => {
  if (!assetPath || typeof assetPath !== "string") {
    return "";
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = normalizeSlashes(assetPath);
  const uploadsIndex = normalizedPath.toLowerCase().lastIndexOf("/uploads/");

  if (uploadsIndex >= 0) {
    return normalizedPath.slice(uploadsIndex);
  }

  if (normalizedPath.toLowerCase().startsWith("uploads/")) {
    return `/${normalizedPath}`;
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
};

const resolveLocalAssetPath = (assetUrl) => {
  const publicPath = toPublicAssetPath(assetUrl);

  if (!publicPath.startsWith("/uploads/")) {
    return null;
  }

  const absolutePath = path.normalize(path.join(appRoot, publicPath));
  const normalizedUploadsRoot = path.normalize(uploadsRoot + path.sep);

  if (!absolutePath.startsWith(normalizedUploadsRoot)) {
    return null;
  }

  return absolutePath;
};

const extractCloudinaryPublicId = (assetUrl) => {
  if (!assetUrl || typeof assetUrl !== "string") {
    return null;
  }

  const [, uploadPath] = assetUrl.split("/upload/");
  if (!uploadPath) {
    return null;
  }

  const withoutVersion = uploadPath.replace(/^v\d+\//, "");
  const publicId = withoutVersion.replace(/\.[^/.]+$/, "");

  return publicId || null;
};

const destroyStoredAsset = async (cloudinary, assetUrl, options = {}) => {
  const { skipIfExternal = false } = options;

  if (!assetUrl || typeof assetUrl !== "string") {
    return false;
  }

  // 👉 Safety: don't touch external URLs
  if (skipIfExternal && /^https?:\/\//i.test(assetUrl) && !assetUrl.includes("res.cloudinary.com")) {
    return false;
  }

  const publicId = extractCloudinaryPublicId(assetUrl);

  // 👉 LOCAL FILE DELETE
  if (!publicId) {
    const localAssetPath = resolveLocalAssetPath(assetUrl);

    if (!localAssetPath) return false;

    try {
      await fs.unlink(localAssetPath);
      return true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return false;
    }
  }

  // 👉 CLOUDINARY DELETE (SAFE)
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    // 👉 Only treat as success if actually deleted
    if (result.result !== "ok" && result.result !== "not found") {
      console.log("Cloudinary delete skipped:", result);
      return false;
    }

    return true;
  } catch (err) {
    console.log("Cloudinary delete error:", err.message);
    return false;
  }
};

module.exports = {
  toPublicAssetPath,
  extractCloudinaryPublicId,
  destroyStoredAsset,
  destroyCloudinaryAsset: destroyStoredAsset,
};
