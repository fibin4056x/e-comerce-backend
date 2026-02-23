const express = require('express');
const router = express.Router();
const {protect}=require('../middleware/authMiddleware');
const {
    createOrder,
    getmyOrders,
}=require("../controllers/orderController");

router.post("/",protect,createOrder);
router.get('/myorders', protect,getmyOrders);

module.exports=router;