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
    required: true
  },

  image: {
    type: String
  },

  size: {
    type: String,
    required: true
  },

  color: {
    type: String,
    required: true
  },

  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  price: {
    type: Number,
    required: true
  }

},
{ _id: false }
);



/* ==========================================
   SHIPPING ADDRESS
========================================== */

const shippingAddressSchema = new mongoose.Schema(
{
  address: {
    type: String,
    required: true
  },

  city: {
    type: String,
    required: true
  },

  postalCode: {
    type: String,
    required: true
  },

  country: {
    type: String,
    required: true
  }

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

  orderItems: [orderItemSchema],

  shippingAddress: shippingAddressSchema,



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
    type: String
  },



  /* =========================
     PRICE DETAILS
  ========================= */

  itemsPrice: {
    type: Number,
    default: 0
  },

  shippingPrice: {
    type: Number,
    default: 0
  },

  taxPrice: {
    type: Number,
    default: 0
  },

  totalPrice: {
    type: Number,
    required: true
  }



},
{
  timestamps: true
}
);



/* ==========================================
   INDEXES (PERFORMANCE)
========================================== */

orderSchema.index({ user: 1 });
orderSchema.index({ createdAt: -1 });



module.exports = mongoose.model("Order", orderSchema);