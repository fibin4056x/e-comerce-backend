const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 100 // prevent abuse
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true // faster lookup
  }, 
  items: {
    type: [cartItemSchema],
    default: []
  },
  totalPrice: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

/* =========================
   PRE-SAVE SAFETY
========================= */

// Prevent invalid variant entries
cartSchema.pre("save", function (next) {
  if (!this.items || this.items.length === 0) {
    this.totalPrice = 0;
    return next();
  }

  for (const item of this.items) {
    if (!item.size || !item.color) {
      return next(new Error("Invalid cart item variant"));
    }
  }

  next();
});

module.exports = mongoose.model("Cart", cartSchema);