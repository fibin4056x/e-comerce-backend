const express=require("express");
const router=express.Router();

const {getProducts,createProduct}=require("../controllers/productController");
const {protect,admin}= require("../middleware/authMiddleware")
//Get all products
router.get("/",getProducts);

//CREATE new product
router.post("/", protect, admin ,createProduct);

module.exports= router;