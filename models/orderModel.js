const mongoose = require("mongoose");

/* ==========================================
   ORDER ITEM SCHEMA
========================================== */

const orderItemSchema = new mongoose.Schema(
{
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  image: {
    type: String,
    trim: true
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
    min: 1,
    max: 100
  },

  price: {
    type: Number,
    required: true,
    min: 0
  }

},
{ _id: false }
);


/* ==========================================
   SHIPPING ADDRESS
========================================== */

const shippingAddressSchema = new mongoose.Schema(
{
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true }
},
{ _id: false }
);


/* ==========================================
   ORDER SCHEMA
========================================== */

const orderSchema = new mongoose.Schema(
{

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  orderItems: {
    type: [orderItemSchema],
    validate: {
      validator: function (val) {
        return val && val.length > 0;
      },
      message: "Order must contain at least one item"
    }
  },

  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },


  /* =========================
     PAYMENT
  ========================= */

  paymentMethod: {
    type: String,
    enum: ["COD","Stripe","Paypal"],
    default: "COD"
  },

  isPaid: {
    type: Boolean,
    default: false
  },

  paidAt: Date,


  /* =========================
     ORDER STATUS PIPELINE
  ========================= */

  status: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled"
    ],
    default: "Pending"
  },


  /* =========================
     DELIVERY
  ========================= */

  isDelivered: {
    type: Boolean,
    default: false
  },

  deliveredAt: Date,


  /* =========================
     SHIPPING TRACKING
  ========================= */

  trackingNumber: {
    type: String,
    trim: true
  },


  /* =========================
     PRICE DETAILS
  ========================= */

  itemsPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  shippingPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  taxPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }

},
{
  timestamps: true
}
);


/* ==========================================
   PRE-SAVE SAFETY (CRITICAL)
========================================== */

orderSchema.pre("save",  (next) =>{

  // Ensure paidAt exists if paid
  if (this.isPaid && !this.paidAt) {
    this.paidAt = new Date();
  }

  // Ensure deliveredAt exists if delivered
  if (this.isDelivered && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }

  // Keep status consistent
  if (this.isDelivered) {
    this.status = "Delivered";
  }

  // Basic price integrity check
  const calculatedTotal =
    (this.itemsPrice || 0) +
    (this.shippingPrice || 0) +
    (this.taxPrice || 0);

  if (Math.abs(calculatedTotal - this.totalPrice) > 1) {
    return next(new Error("Invalid total price calculation"));
  }

  next();
});


/* ==========================================
   INDEXES (PERFORMANCE)
========================================== */

orderSchema.index({ user: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);