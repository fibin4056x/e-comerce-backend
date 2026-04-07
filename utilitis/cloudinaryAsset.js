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

const destroyCloudinaryAsset = async (cloudinary, assetUrl) => {
  const publicId = extractCloudinaryPublicId(assetUrl);

  if (!publicId) {
    return false;
  }

  await cloudinary.uploader.destroy(publicId);
  return true;
};

module.exports = {
  extractCloudinaryPublicId,
  destroyCloudinaryAsset,
};
