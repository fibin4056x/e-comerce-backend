require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./config/db");
const adminUserRoutes = require("./routes/adminUserRoutes");


const app = express();
connectDB();
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://e-comercer-frontend.vercel.app",
];
const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  : defaultAllowedOrigins;

// If behind a proxy (Render/Heroku/Nginx), this helps secure cookies work correctly.
app.set("trust proxy", 1);
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.get("/", (req, res) => {
  res.send("🚀 API Running");
});
app.use("/api/admin", adminUserRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});