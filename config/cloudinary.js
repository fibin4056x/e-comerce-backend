const cloudinary = require("cloudinary").v2;

const parseCloudinaryUrl = (cloudinaryUrl) => {
  if (!cloudinaryUrl) {
    return {};
  }

  try {
    const parsedUrl = new URL(cloudinaryUrl);

    if (parsedUrl.protocol !== "cloudinary:") {
      return {};
    }

    return {
      cloud_name: parsedUrl.hostname,
      api_key: decodeURIComponent(parsedUrl.username || ""),
      api_secret: decodeURIComponent(parsedUrl.password || ""),
    };
  } catch {
    return {};
  }
};

const resolveCloudinaryUrl = () => {
  const directUrl = String(process.env.CLOUDINARY_URL || "").trim();
  if (directUrl) {
    return directUrl;
  }

  const nestedUrlSource = [
    process.env.CLOUDINARY_SECRET,
    process.env.CLOUDINARY_API_SECRET,
  ]
    .map((value) => String(value || "").trim())
    .find((value) => value.startsWith("CLOUDINARY_URL="));

  return nestedUrlSource ? nestedUrlSource.slice("CLOUDINARY_URL=".length) : "";
};

const resolvedFromUrl = parseCloudinaryUrl(resolveCloudinaryUrl());

const pickSecret = (...values) =>
  values
    .map((value) => String(value || "").trim())
    .find((value) => value && !value.startsWith("CLOUDINARY_URL=")) || "";

const cloudinaryConfig = {
  cloud_name:
    String(
      process.env.CLOUDINARY_NAME ||
        process.env.CLOUDINARY_CLOUD_NAME ||
        resolvedFromUrl.cloud_name ||
        ""
    ).trim(),
  api_key: String(process.env.CLOUDINARY_API_KEY || resolvedFromUrl.api_key || "").trim(),
  api_secret: pickSecret(
    process.env.CLOUDINARY_SECRET,
    process.env.CLOUDINARY_API_SECRET,
    resolvedFromUrl.api_secret
  ),
};

const hasCloudinaryConfig = Boolean(
  cloudinaryConfig.cloud_name &&
    cloudinaryConfig.api_key &&
    cloudinaryConfig.api_secret
);

if (hasCloudinaryConfig) {
  cloudinary.config(cloudinaryConfig);
}

cloudinary.hasCloudinaryConfig = hasCloudinaryConfig;
cloudinary.cloudinaryConfig = cloudinaryConfig;

module.exports = cloudinary;
