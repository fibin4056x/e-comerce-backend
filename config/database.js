const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  try {
    const connection = await mongoose.connect(mongoUri, {
      autoIndex: process.env.NODE_ENV !== "production",
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
    );

    return connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};

module.exports = connectDB;
