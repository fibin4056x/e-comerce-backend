const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("MONGO_URI:", process.env.MONGO_URI ? "FOUND" : "MISSING");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

  } catch (err) {
    console.error("❌ FULL DB ERROR:", err); // NOT just message
    process.exit(1);
  }
};

module.exports = connectDB;