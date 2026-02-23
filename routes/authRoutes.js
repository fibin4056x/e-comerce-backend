const express =require("express");
const router = express.Router();

const {registerUser, loginUser}=require('../controllers/authController');
const {validateRegister,validateLogin}=require("../middleware/validateUser")
//register
router.post("/register",validateRegister, registerUser);

//login
router.post("/login",validateLogin, loginUser);

module.exports=router;