require("dotenv").config();
const express = require('express');
const cors =require("cors");
const connectDB=require('./config/db');


const app= express();

connectDB();
app.use(cors());
app.use(express.json());
app.use("/api/products",require("./routes/productRoutes"));
app.use("/api/auth",require("./routes/authRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/wishlist",require("./routes/wishlistRoutes"));
app.get("/",(req,res)=>{
    res.send("API  RUNNING");
});

const PORT=process.env.PORT||5000;

app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`)
});
