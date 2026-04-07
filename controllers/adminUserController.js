const User = require("../models/userModel");
const mongoose = require("mongoose");

/* ==========================================
   GET ALL USERS (PAGINATION)
========================================== */
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find()
        .select("username email role isBanned createdAt")
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(),
    ]);

    res.json({
      users,
      page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   UPDATE USER ROLE
========================================== */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const allowedRoles = ["user", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Role updated",
      role: user.role,
    });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   BAN / UNBAN USER
========================================== */
const toggleBan = async (req, res) => {
  try {
    const { banned } = req.body;

    if (typeof banned !== "boolean") {
      return res.status(400).json({
        message: "banned must be true or false",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: banned },
      { new: true, runValidators: true }
    ).select("isBanned");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: banned ? "User banned" : "User unbanned",
      isBanned: user.isBanned,
    });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   DELETE USER
========================================== */
const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // 🔴 Prevent admin deleting themselves
    if (req.user && req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  toggleBan,
  deleteUser,
};