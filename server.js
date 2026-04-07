require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const path = require("path");

const connectDB = require("./config/database");
const adminRoutes = require("./routes/adminRoutesV2");
const adminUserRoutes = require("./routes/adminUserRoutesV2");

const app = express();

const requiredEnv = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

/* =========================
   CORS CONFIG
========================= */

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://e-comercer-frontend.vercel.app",
];

const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultAllowedOrigins;

app.disable("x-powered-by");
app.set(
  "trust proxy",
  process.env.TRUST_PROXY
    ? Number(process.env.TRUST_PROXY)
    : process.env.NODE_ENV === "production"
      ? 1
      : 0
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed by CORS");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

/* =========================
   MIDDLEWARE
========================= */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
});

/* =========================
   ROUTES
========================= */

app.use("/api/products", require("./routes/productRoutesV2"));
app.use("/api/auth", require("./routes/authRoutesV2"));
app.use("/api/cart", require("./routes/cartRoutesV2"));
app.use("/api/orders", require("./routes/orderRoutesV2"));
app.use("/api/wishlist", require("./routes/wishlistRoutesV2"));
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminUserRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "API running" });
});

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
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Server error";

  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON payload";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  } else if (err.name === "MulterError") {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists";
  }

  if (statusCode >= 500) {
    console.error("Unhandled error:", err);
  }

  return res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== "production" && statusCode >= 500
      ? { stack: err.stack }
      : {}),
  });
});

/* =========================
   START SERVER
========================= */

const PORT = Number(process.env.PORT) || 5000;
let server;

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    try {
      await mongoose.connection.close();
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
};

const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  shutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
