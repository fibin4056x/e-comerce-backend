const Product = require("../models/productModel");
const cloudinary = require("../config/cloudinary");
const {
  destroyStoredAsset,
  toPublicAssetPath,
} = require("../utilitis/cloudinaryAsset");

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).trim().toLowerCase() === "true";
};

const parseOptionalNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return parsed;
};

const parseVariants = (rawVariants) => {
  if (rawVariants === undefined) {
    return undefined;
  }

  const parsed =
    typeof rawVariants === "string"
      ? rawVariants.trim() === ""
        ? []
        : JSON.parse(rawVariants)
      : rawVariants;

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid variants format");
  }

  return parsed.map((variant) => {
    const size = String(variant?.size || "").trim();
    const color = String(variant?.color || "").trim();
    const stock = Number(variant?.stock);

    if (!size || !color || !Number.isInteger(stock) || stock < 0) {
      throw new Error("Each variant must include valid size, color, and stock");
    }

    return { size, color, stock };
  });
};

const calculateRating = (product) => {
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.length === 0
      ? 0
      : product.reviews.reduce((acc, item) => acc + item.rating, 0) /
        product.reviews.length;
};

const buildProductPayload = (body, options = {}) => {
  const { partial = false } = options;
  const payload = {};

  const stringFields = ["name", "brand", "category", "type", "description"];
  for (const field of stringFields) {
    if (body[field] !== undefined) {
      payload[field] = String(body[field]).trim();
    }
  }

  const price = parseOptionalNumber(body.price, "price");
  if (price !== undefined) {
    payload.price = price;
  } else if (!partial) {
    throw new Error("Invalid price");
  }

  const originalPrice = parseOptionalNumber(body.originalPrice, "original price");
  if (originalPrice !== undefined) {
    payload.originalPrice = originalPrice;
  }

  const discount = parseOptionalNumber(body.discount, "discount");
  if (discount !== undefined) {
    payload.discount = discount;
  }

  const variants = parseVariants(body.variants);
  if (variants !== undefined) {
    payload.variants = variants;
  }

  if (body.isFeatured !== undefined) {
    payload.isFeatured = normalizeBoolean(body.isFeatured);
  } else if (!partial) {
    payload.isFeatured = false;
  }

  if (body.isNewArrival !== undefined) {
    payload.isNewArrival = normalizeBoolean(body.isNewArrival);
  } else if (!partial) {
    payload.isNewArrival = false;
  }

  return payload;
};

const validateReviewInput = (rating, comment) => {
  const numericRating = Number(rating);
  const normalizedComment = String(comment || "").trim();

  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return { error: "Rating must be between 1 and 5" };
  }

  if (!normalizedComment) {
    return { error: "Review comment is required" };
  }

  return { numericRating, normalizedComment };
};

const isAdminUser = (user) => String(user?.role || "").trim().toLowerCase() === "admin";

const getVariantStock = (variant) => Number(variant?.stock) || 0;

const sanitizeVariantForViewer = (variant, showAdminFields) => {
  const normalizedVariant =
    typeof variant?.toObject === "function" ? variant.toObject() : { ...variant };

  if (showAdminFields) {
    return normalizedVariant;
  }

  return {
    _id: normalizedVariant._id,
    size: normalizedVariant.size,
    color: normalizedVariant.color,
    available: getVariantStock(normalizedVariant) > 0,
  };
};

const sanitizeProductForViewer = (product, user) => {
  const normalizedProduct =
    typeof product?.toObject === "function" ? product.toObject() : { ...product };
  const showAdminFields = isAdminUser(user);
  const variants = Array.isArray(normalizedProduct.variants)
    ? normalizedProduct.variants.map((variant) =>
        sanitizeVariantForViewer(variant, showAdminFields)
      )
    : [];

  if (showAdminFields) {
    return {
      ...normalizedProduct,
      variants,
    };
  }

  const totalStock = Array.isArray(normalizedProduct.variants)
    ? normalizedProduct.variants.reduce(
        (total, variant) => total + getVariantStock(variant),
        0
      )
    : 0;

  return {
    ...normalizedProduct,
    price: null,
    originalPrice: null,
    discount: null,
    variants,
    inStock: totalStock > 0,
  };
};

const getProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
      filter.category = new RegExp(`^${escapeRegExp(category)}$`, "i");
    }

    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
    const pageNumber = Math.max(1, Number(req.query.pageNumber) || 1);

    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (pageNumber - 1))
      .lean();

    return res.status(200).json({
      products: products.map((product) => sanitizeProductForViewer(product, req.user)),
      page: pageNumber,
      pages: Math.ceil(totalProducts / pageSize),
      totalProducts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getProductsById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "reviews.user",
      "username"
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json(sanitizeProductForViewer(product, req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const payload = buildProductPayload(req.body);
    const imageUrls = req.files?.map((file) => toPublicAssetPath(file.path)) || [];

    const product = new Product({
      ...payload,
      images: imageUrls,
    });

    const saved = await product.save();
    return res.status(201).json(saved);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Server Error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const payload = buildProductPayload(req.body, { partial: true });

    if (req.files?.length) {
      await Promise.all(
        (product.images || []).map((image) =>
          destroyStoredAsset(cloudinary, image).catch(() => false)
        )
      );

      payload.images = req.files.map((file) => toPublicAssetPath(file.path));
    }

    Object.assign(product, payload);

    const updated = await product.save();
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Server Error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Promise.all(
      (product.images || []).map((image) =>
        destroyStoredAsset(cloudinary, image).catch(() => false)
      )
    );

    await product.deleteOne();

    return res.json({ message: "Product removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};

const addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { error, numericRating, normalizedComment } = validateReviewInput(
      rating,
      comment
    );

    if (error) {
      return res.status(400).json({ message: error });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyReviewed = product.reviews.find(
      (review) => review.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Already reviewed" });
    }

    product.reviews.push({
      user: req.user._id,
      name: req.user.username,
      rating: numericRating,
      comment: normalizedComment,
    });

    calculateRating(product);
    await product.save();

    return res.status(201).json({ message: "Review added" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { error, numericRating, normalizedComment } = validateReviewInput(
      rating,
      comment
    );

    if (error) {
      return res.status(400).json({ message: error });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to update this review" });
    }

    review.rating = numericRating;
    review.comment = normalizedComment;

    calculateRating(product);
    await product.save();

    return res.json({ message: "Review updated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to delete this review" });
    }

    review.deleteOne();
    calculateRating(product);
    await product.save();

    return res.json({ message: "Review removed" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductsById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  updateProductReview,
  deleteProductReview,
};
