const express =require("express");
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require("../controllers/authController");
const {validateRegister,validateLogin}=require("../middleware/validateUser");
const {protect}=require("../middleware/authMiddleware")
//register
router.post("/register",validateRegister, registerUser);

//login
router.post("/login",validateLogin, loginUser);

//profile
router.get("/profile",protect,getUserProfile)
module.exports=router;