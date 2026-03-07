const express=require("express");
const router=express.Router();
const upload=require("../middleware/uploadMiddleware")
const {getProducts,createProduct, updateProduct, deleteProduct, getProductsbyId,addProductReview,updateProductReview,deleteProductReview}=require("../controllers/productController");
const {protect,admin}= require("../middleware/authMiddleware")
//Get all products
router.get("/",getProducts);
//GEt products by id
router.get("/:id",getProductsbyId)
//CREATE new product
router.post("/", protect, admin ,upload.array("images",5),createProduct);
//update product
router.put("/:id", protect, admin, upload.array("images", 5), updateProduct);
//delete product
router.delete("/:id",protect,admin,deleteProduct)
//review
router.post("/:id/reviews", protect, addProductReview);

router.put("/:id/reviews/:reviewId", protect, updateProductReview);

router.delete("/:id/reviews/:reviewId", protect, deleteProductReview);
module.exports= router;