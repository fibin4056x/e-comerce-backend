const mongoose = require("mongoose");

const connectDB =async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongodb connected");

    }catch(err){
        console.error("DB Error", error.message);
        process.exit(1);
    }
};

module.exports=connectDB;