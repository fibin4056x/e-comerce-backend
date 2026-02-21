require("dotenv").config();
const express = require('express');
const cors =require("cors");
const connectDB=require('./confiq/db');

const app= express();

connectDB();
app.use(cors());
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("API  RUNNING");
});

const PORT=process.env.PORT||5000;

app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`)
});