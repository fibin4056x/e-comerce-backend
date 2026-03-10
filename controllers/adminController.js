const User = require("../models/userModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");

/* ==========================================
   DASHBOARD MAIN STATS (PARALLEL QUERIES)
========================================== */

const getDashboardStats = async (req, res) => {
  try {

    const [userCount, productCount, orderCount, revenue] = await Promise.all([

      User.countDocuments(),

      Product.countDocuments(),

      Order.countDocuments(),

      Order.aggregate([
        {
          $group: {
            _id: null,
            revenue: { $sum: "$totalPrice" }
          }
        }
      ])

    ]);

    res.json({
      users: userCount,
      products: productCount,
      orders: orderCount,
      revenue: revenue[0]?.revenue || 0
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ==========================================
   RECENT ORDERS (LIGHT QUERY)
========================================== */

const getRecentOrders = async (req, res) => {
  try {

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "username email")
      .select("user totalPrice orderStatus createdAt")
      .lean();

    res.json(orders);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ==========================================
   TOP SELLING PRODUCTS (AGGREGATION)
========================================== */

const getTopProducts = async (req, res) => {
  try {

    const products = await Order.aggregate([

      { $unwind: "$orderItems" },

      {
        $group: {
          _id: "$orderItems.product",
          totalSold: { $sum: "$orderItems.quantity" }
        }
      },

      { $sort: { totalSold: -1 } },

      { $limit: 5 },

      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },

      { $unwind: "$product" },

      {
        $project: {
          name: "$product.name",
          price: "$product.price",
          images: "$product.images",
          totalSold: 1
        }
      }

    ]);

    res.json(products);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


/* ==========================================
   MONTHLY REVENUE (CHART DATA)
========================================== */

const getMonthlyRevenue = async (req, res) => {
  try {

    const revenue = await Order.aggregate([

      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$totalPrice" }
        }
      },

      { $sort: { "_id": 1 } }

    ]);

    res.json(revenue);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
 

module.exports = {
  getDashboardStats,
  getRecentOrders,
  getTopProducts,
  getMonthlyRevenue
};