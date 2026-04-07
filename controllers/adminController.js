const User = require("../models/userModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");

/* ==========================================
   DASHBOARD STATS
========================================== */
const getDashboard = async (req, res) => {
  try {
    const [userCount, productCount, orderState] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.aggregate([
        {
          $facet: {
            totalOrders: [{ $count: "count" }],
            deliveredOrders: [
              { $match: { status: "Delivered" } },
              { $count: "count" },
            ],
            pendingOrders: [
              { $match: { status: "Pending" } },
              { $count: "count" },
            ],
            cancelledOrders: [
              { $match: { status: "Cancelled" } },
              { $count: "count" },
            ],
            revenue: [
              { $match: { status: "Delivered" } },
              {
                $group: {
                  _id: null,
                  total: { $sum: "$totalPrice" },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const stats = orderState[0] || {};

    res.json({
      users: userCount,
      products: productCount,
      orders: stats.totalOrders?.[0]?.count || 0,
      deliveredOrders: stats.deliveredOrders?.[0]?.count || 0,
      pendingOrders: stats.pendingOrders?.[0]?.count || 0,
      cancelledOrders: stats.cancelledOrders?.[0]?.count || 0,
      revenue: stats.revenue?.[0]?.total || 0,
    });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   MONTHLY REVENUE
========================================== */
const getMonthlyRevenue = async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$totalPrice" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    res.json({ revenue });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   RECENT ORDERS (PAGINATION)
========================================== */
const getRecentOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username email")
        .lean(),

      Order.countDocuments(),
    ]);

    res.json({
      orders,
      page,
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
    });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ==========================================
   TOP SELLING PRODUCTS
========================================== */
const getTopProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip = (page - 1) * limit;

    const products = await Order.aggregate([
      { $unwind: "$orderItems" },

      {
        $group: {
          _id: "$orderItems.product",
          totalSold: { $sum: "$orderItems.quantity" },
        },
      },

      { $sort: { totalSold: -1 } },
      { $skip: skip },
      { $limit: limit },

      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },

      { $unwind: "$product" },

      {
        $project: {
          _id: 0,
          name: "$product.name",
          price: "$product.price",
          images: "$product.images",
          totalSold: 1,
        },
      },
    ]);

    res.json({ products });

  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getDashboard,
  getMonthlyRevenue,
  getRecentOrders,
  getTopProducts,
};