const Product = require("../models/productModel");
const cloudinary = require("../config/cloudinary");

/* ==========================================
   HELPER: extract correct public_id
========================================== */
const extractPublicId = (url) => {
  if (!url) return null;

  const parts = url.split("/upload/");
  if (!parts[1]) return null;

  return parts[1]
    .replace(/^v\d+\//, "") // remove version
    .replace(/\.[^/.]+$/, ""); // remove extension
};

/* ==========================================
   GET ALL PRODUCTS
========================================== */
const getProducts = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = {};
    if (category) {
      filter.category = new RegExp(`^${category}$`, "i");
    }

    const pageSize = Number(req.query.pageSize) || 10;
    const pageNumber = Number(req.query.pageNumber) || 1;

    const totalproducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .limit(pageSize)
      .skip(pageSize * (pageNumber - 1));

    res.status(200).json({
      products,
      page: pageNumber,
      pages: Math.ceil(totalproducts / pageSize),
      totalproducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   GET PRODUCT BY ID
========================================== */
const getProductsbyId = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("reviews.user", "username");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   CREATE PRODUCT
========================================== */
const createProduct = async (req, res) => {
  try {
    const imageUrls = req.files?.map((file) => file.path) || [];

    let variants = [];
    if (req.body.variants) {
      try {
        variants = JSON.parse(req.body.variants);
      } catch {
        return res.status(400).json({ message: "Invalid variants format" });
      }
    }

    const product = new Product({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      type: req.body.type,
      description: req.body.description,
      price: req.body.price,
      originalPrice: req.body.originalPrice,
      discount: req.body.discount,
      variants,
      isFeatured: req.body.isFeatured === "true",
      isNewArrival: req.body.isNewArrival === "true",
      images: imageUrls,
    });

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   UPDATE PRODUCT (FIXED)
========================================== */
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const oldImages = product.images || [];
    let newImages = oldImages;

    // 👉 Upload new images FIRST
    if (req.files && req.files.length > 0) {
      newImages = req.files.map((file) => file.path);
    }

    let variants = product.variants;
    if (req.body.variants) {
      variants = JSON.parse(req.body.variants);
    }

    // 👉 Update fields
    product.name = req.body.name || product.name;
    product.brand = req.body.brand || product.brand;
    product.category = req.body.category || product.category;
    product.type = req.body.type || product.type;
    product.description = req.body.description || product.description;
    product.price = req.body.price || product.price;
    product.originalPrice =
      req.body.originalPrice || product.originalPrice;
    product.discount = req.body.discount || product.discount;
    product.variants = variants;
    product.isFeatured = req.body.isFeatured === "true";
    product.isNewArrival = req.body.isNewArrival === "true";
    product.images = newImages;

    const updated = await product.save();

    // 👉 SAFE DELETE OLD IMAGES
    if (req.files && req.files.length > 0) {
      for (const img of oldImages) {
        if (!newImages.includes(img)) {
          const publicId = extractPublicId(img);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }
    }

    res.json(updated);
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   DELETE PRODUCT (FIXED)
========================================== */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 👉 Correct delete
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        const publicId = extractPublicId(img);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
    }

    await product.deleteOne();

    res.json({ message: "Product removed successfully" });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   REVIEW FUNCTIONS (unchanged)
========================================== */

const calculateRating = (product) => {
  product.numReviews = product.reviews.length;

  product.rating =
    product.reviews.length === 0
      ? 0
      : product.reviews.reduce((acc, item) => acc + item.rating, 0) /
        product.reviews.length;
};

const addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Already reviewed" });
    }

    const review = {
      user: req.user._id,
      name: req.user.username,
      rating: Number(rating),
      comment,
    };

    product.reviews.push(review);
    calculateRating(product);

    await product.save();
    res.status(201).json({ message: "Review added" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const review = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!review) return res.status(404).json({ message: "Review not found" });

    review.rating = Number(rating);
    review.comment = comment;

    calculateRating(product);
    await product.save();

    res.json({ message: "Review updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.reviews = product.reviews.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );

    calculateRating(product);
    await product.save();

    res.json({ message: "Review removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductsbyId,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  updateProductReview,
  deleteProductReview,
};