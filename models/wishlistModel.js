const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true,
        unique:true,
        index: true
    },
    products:{
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref:"Product"
            }
        ],
        default: []
    },
},{timestamps:true});


/* =========================
   PRE-SAVE SAFETY
========================= */

wishlistSchema.pre("save", function (next) {

    if (!this.products || this.products.length === 0) {
        this.products = [];
        return next();
    }

    // Remove duplicates
    const uniqueProducts = [...new Set(this.products.map(p => p.toString()))];

    this.products = uniqueProducts.map(id => new mongoose.Types.ObjectId(id));

    next();
});

module.exports = mongoose.model("Wishlist", wishlistSchema);