const express=require("express");
const router=express.Router();
const upload=require("../middleware/uploadMiddleware")
const {getProducts,createProduct, updateProduct, deleteProduct, getProductsbyId}=require("../controllers/productController");
const {protect,admin}= require("../middleware/authMiddleware")
//Get all products
router.get("/",getProducts);
//GEt products by id
router.get("/:id",getProductsbyId)
//CREATE new product
router.post("/", protect, admin ,upload.array("images",5),createProduct);
//update product
router.put("/:id",protect,admin,updateProduct);
//delete product
router.delete("/:id",protect,admin,deleteProduct)

module.exports= router;