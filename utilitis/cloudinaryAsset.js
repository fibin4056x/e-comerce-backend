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

const destroyStoredAsset = async (cloudinary, assetUrl) => {
  const publicId = extractCloudinaryPublicId(assetUrl);

  if (!publicId) {
    const localAssetPath = resolveLocalAssetPath(assetUrl);

    if (!localAssetPath) {
      return false;
    }

    try {
      await fs.unlink(localAssetPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    return true;
  }

  await cloudinary.uploader.destroy(publicId);
  return true;
};

module.exports = {
  toPublicAssetPath,
  extractCloudinaryPublicId,
  destroyStoredAsset,
  destroyCloudinaryAsset: destroyStoredAsset,
};
