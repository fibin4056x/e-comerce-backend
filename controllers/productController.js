const Product = require("../models/productModel");

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

    const products = await Product.find(filter);

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   GET PRODUCT BY ID (WITH REVIEWS)
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
const createProduct = async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({
        message: "Name and price are required",
      });
    }

    let imagePaths = [];

    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(
        (file) => `/uploads/${file.filename}`
      );
    }

    let parsedVariants = [];

    if (req.body.variants) {
      try {
        parsedVariants = JSON.parse(req.body.variants);
      } catch (err) {
        return res.status(400).json({
          message: "Invalid variants format",
        });
      }
    }

    const product = new Product({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      type: req.body.type,
      description: req.body.description,
      price: Number(req.body.price),
      originalPrice: Number(req.body.originalPrice) || 0,
      discount: Number(req.body.discount) || 0,
      isFeatured: req.body.isFeatured === "true",
      isNewArrival: req.body.isNewArrival === "true",
      images: imagePaths,
      variants: parsedVariants,
    });

    const savedProduct = await product.save();

    res.status(201).json(savedProduct);

  } catch (error) {
    next(error);
  }
};

/* ==========================================
   UPDATE PRODUCT
========================================== */
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.name = req.body.name || product.name;
    product.brand = req.body.brand || product.brand;
    product.category = req.body.category || product.category;
    product.type = req.body.type || product.type;
    product.description = req.body.description || product.description;
    product.price = req.body.price ?? product.price;
    product.discount = req.body.discount ?? product.discount;
    product.isFeatured = req.body.isFeatured ?? product.isFeatured;
    product.isNewArrival = req.body.isNewArrival ?? product.isNewArrival;

    const updatedProduct = await product.save();

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   DELETE PRODUCT
========================================== */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.deleteOne();

    res.json({ message: "Product removed successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   ADD REVIEW
========================================== */
const addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Product already reviewed" });
    }

    const review = {
      user: req.user._id,
      name: req.user.username,
      rating: Number(rating),
      comment,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc, item) => acc + item.rating, 0) /
      product.reviews.length;

    await product.save();

    res.status(201).json({ message: "Review added" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   UPDATE REVIEW
========================================== */
const updateProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const review = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    review.rating = Number(rating);
    review.comment = comment;

    product.rating =
      product.reviews.reduce((acc, item) => acc + item.rating, 0) /
      product.reviews.length;

    await product.save();

    res.json({ message: "Review updated" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================================
   DELETE REVIEW
========================================== */
const deleteProductReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.reviews = product.reviews.filter(
      (r) => r.user.toString() !== req.user._id.toString()
    );

    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.length === 0
        ? 0
        : product.reviews.reduce((acc, item) => acc + item.rating, 0) /
          product.reviews.length;

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