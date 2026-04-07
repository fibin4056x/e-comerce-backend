const Product = require("../models/productModel");
const fs = require("fs");
const path = require("path");

// #region agent log helper
const DEBUG_LOG_PATH = path.join(__dirname, "..", "..", "debug-ccfac5.log");
function writeDebug(payload) {
  try {
    fs.appendFileSync(
      DEBUG_LOG_PATH,
      JSON.stringify({
        sessionId: "ccfac5",
        runId: payload.runId || "initial",
        hypothesisId: payload.hypothesisId,
        location: payload.location,
        message: payload.message,
        data: payload.data,
        timestamp: Date.now(),
      }) + "\n"
    );
  } catch (_) {}
}
// #endregion
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

    const totalproducts = await Product.countDocuments(filter).lean();

    const products = await Product.find(filter)
      .limit(pageSize)
      .skip(pageSize * (pageNumber - 1))
      .lean();

    writeDebug({
      hypothesisId: "H-back-products",
      location: "productController.getProducts",
      message: "getProducts results",
      data: {
        category: category || null,
        pageSize,
        pageNumber,
        totalproducts,
        returnedCount: products.length,
      },
    });

    res.status(200).json({
      products,
      page: pageNumber,
      pages: Math.ceil(totalproducts / pageSize),
      totalproducts,
    });
  } catch (error) {
    writeDebug({
      hypothesisId: "H-back-products-err",
      location: "productController.getProducts",
      message: "getProducts error",
      data: { message: error.message },
    });
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
    writeDebug({
      hypothesisId: "H-back-create",
      location: "productController.createProduct",
      message: "createProduct called",
      data: {
        hasFiles: Boolean(req.files && req.files.length > 0),
        bodyKeys: req.body ? Object.keys(req.body) : null,
      },
    });
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

    /* ================= BASIC FIELDS ================= */

    product.name = req.body.name ?? product.name;
    product.brand = req.body.brand ?? product.brand;
    product.category = req.body.category ?? product.category;
    product.type = req.body.type ?? product.type;
    product.description = req.body.description ?? product.description;

    if (req.body.price !== undefined) {
      product.price = Number(req.body.price);
    }

    if (req.body.originalPrice !== undefined) {
      product.originalPrice = Number(req.body.originalPrice);
    }

    /* ================= AUTO DISCOUNT CALC ================= */

    if (product.originalPrice > 0) {
      product.discount = Math.round(
        ((product.originalPrice - product.price) /
          product.originalPrice) *
          100
      );
    } else {
      product.discount = 0;
    }

    /* ================= BOOLEAN FIELDS ================= */

    if (req.body.isFeatured !== undefined) {
      product.isFeatured = req.body.isFeatured === "true";
    }

    if (req.body.isNewArrival !== undefined) {
      product.isNewArrival = req.body.isNewArrival === "true";
    }

    /* ================= HANDLE VARIANTS ================= */

    if (req.body.variants) {
      try {
        const parsedVariants = JSON.parse(req.body.variants);

        if (!Array.isArray(parsedVariants)) {
          return res
            .status(400)
            .json({ message: "Variants must be an array" });
        }

        product.variants = parsedVariants.map((v) => ({
          size: v.size,
          color: v.color,
          stock: Number(v.stock),
        }));

      } catch (err) {
        return res
          .status(400)
          .json({ message: "Invalid variants format" });
      }
    }

    /* ================= HANDLE NEW IMAGES ================= */

    if (req.files && req.files.length > 0) {
      /* DLT OLD IMG */
      product.images.forEach((img)=>{
        const filePath =path.join(__dirname,"..",img);

        if(fs.existsSync(filePath)){
          fs.unlinkSync(filePath)
        }
      })
      const newImages = req.files.map(
        (file) => `/uploads/${file.filename}`
      );

      product.images = newImages; // replace images
    }

    const updatedProduct = await product.save();

    res.status(200).json(updatedProduct);

  } catch (error) {
    console.error(error); // IMPORTANT FOR DEBUG
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
 /* DELETE IMAGES FROM SERVER*/
    product.images.forEach((img)=> {
      const filePath = path.join(__dirname,"..",img);
        if(fs.existsSync(filePath)){
          fs.unlinkSync(filePath);
        }
    })
    await product.deleteOne();

    res.json({ message: "Product removed successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


 const calculateRating =(product)=>{

  product.numReviews =product.reviews.length;

  product.reviews.length === 0
  ? 0
  :product.reviews.reduce((acc,item) => acc +item.rating,0)/
   product.reviews.length;

 }
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
    calculateRating(product)

    await product.save();

    res.status(201).json({ message: "Review added" });

  } catch (error) {
    console.error(error);
    
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
    calculateRating(product)

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

    calculateRating(product)

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