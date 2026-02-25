const express = require('express');
const router = express.Router();
const {protect}=require("../middleware/authMiddleware");
const {
      getWishlist,
    addToWishlist,
    removeFromWishlist,
}=require("../controllers/wishlistcontroller");

router.get("/",protect,getWishlist);
router.post("/",protect,addToWishlist);
router.delete("/:productId",protect,removeFromWishlist);

module.exports= router;