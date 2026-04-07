const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      index: true
    },
    type: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    images: {
      type: [String],
      default: []
    },
    variants: {
      type: [variantSchema],
      default: []
    },

    /* ⭐ REVIEW SYSTEM */
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    numReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    reviews: {
      type: [reviewSchema],
      default: []
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


/* ==========================================
   PRE-SAVE SAFETY
========================================== */

productSchema.pre("save", function (next) {

  /* ✅ Prevent duplicate variants */
  const seen = new Set();

  for (const v of this.variants) {
    const key = `${v.size}-${v.color}`.toLowerCase();

    if (seen.has(key)) {
      return next(new Error("Duplicate variant detected"));
    }

    seen.add(key);
  }

  /* ✅ Price consistency */
  if (this.originalPrice && this.originalPrice < this.price) {
    return next(new Error("Original price cannot be less than selling price"));
  }

  /* ✅ Discount sanity */
  if (this.discount > 0 && this.discount > 100) {
    return next(new Error("Invalid discount value"));
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);