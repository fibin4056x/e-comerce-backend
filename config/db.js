const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("MONGO_URI:", process.env.MONGO_URI ? "FOUND" : "MISSING");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    // #region agent log
    try {
      const conn = mongoose.connection;
      const safeHost = conn?.host || conn?.client?.s?.url || null;
      const safeDb = conn?.name || null;
      const fs = require("fs");
      const path = require("path");
      const entry = JSON.stringify({
        sessionId: "ccfac5",
        runId: "initial",
        hypothesisId: "H-back-conn",
        location: "db.js:connectDB",
        message: "Mongo connection info",
        data: { db: safeDb, host: safeHost ? String(safeHost).replace(/\/\/.*@/g, "//***@") : null },
        timestamp: Date.now(),
      });
      fs.appendFileSync(path.join(__dirname, "..", "..", "debug-ccfac5.log"), entry + "\n");
    } catch (_) {}
    // #endregion

  } catch (err) {
    console.error("❌ FULL DB ERROR:", err); // NOT just message
    process.exit(1);
  }
};

module.exports = connectDB;