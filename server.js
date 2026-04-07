require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const connectDB = require("./config/db");
const adminUserRoutes = require("./routes/adminUserRoutes");
const { apiLimiter } = require("./middleware/rateLimiter");

const app = express();
connectDB();

/* =========================
   CORS CONFIG
========================= */

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://e-comercer-frontend.vercel.app",
];

const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : defaultAllowedOrigins;

app.set("trust proxy", 1);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false); // safer than throwing
  },
  credentials: true,
}));

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(apiLimiter); // global protection

/* =========================
   ROUTES
========================= */

app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/admin", adminUserRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API Running");
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  return res.status(500).json({
    message: err.message || "Server error",
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});