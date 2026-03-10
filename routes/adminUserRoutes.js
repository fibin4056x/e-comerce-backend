const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  updateUserRole,
  toggleBan,
  deleteUser
} = require("../controllers/adminUserController");

const {protect,admin} = require("../middleware/authMiddleware");


router.get("/users",protect,admin,getAllUsers);

router.patch("/users/:id/role",protect,admin,updateUserRole);

router.patch("/users/:id/ban",protect,admin,toggleBan);

router.delete("/users/:id",protect,admin,deleteUser);


module.exports = router; 