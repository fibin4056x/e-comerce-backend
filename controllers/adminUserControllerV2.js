const mongoose = require("mongoose");
const User = require("../models/userModel");

const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();
  return value === "user" ? "customer" : value;
};

const ensureNotRemovingLastAdmin = async (user) => {
  if (user.role !== "admin") {
    return null;
  }

  const adminCount = await User.countDocuments({ role: "admin" });
  if (adminCount <= 1) {
    return "At least one admin account must remain active";
  }

  return null;
};

const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      User.find()
        .select("username email role isBanned createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(),
    ]);

    return res.json({
      users,
      page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const role = normalizeRole(req.body.role);
    const allowedRoles = ["customer", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(req.params.id).select("role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin" && role !== "admin") {
      const errorMessage = await ensureNotRemovingLastAdmin(user);
      if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
      }
    }

    user.role = role;
    await user.save();

    return res.json({
      message: "Role updated",
      role: user.role,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

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

    const user = await User.findById(req.params.id).select("role isBanned");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (banned && user.role === "admin") {
      const errorMessage = await ensureNotRemovingLastAdmin(user);
      if (errorMessage) {
        return res.status(400).json({ message: errorMessage });
      }
    }

    user.isBanned = banned;
    await user.save();

    return res.json({
      message: banned ? "User banned" : "User unbanned",
      isBanned: user.isBanned,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (req.user && req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(req.params.id).select("role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const errorMessage = await ensureNotRemovingLastAdmin(user);
    if (errorMessage) {
      return res.status(400).json({ message: errorMessage });
    }

    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getAllUsers,
  updateUserRole,
  toggleBan,
  deleteUser,
};
