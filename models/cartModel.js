const mongoose = require("mongoose");

const cartItemSchema= new mongoose.Schema({
    
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        require: true,
    },
    quantity:{
        type:Number,
        required:true,
        dafault:1,
    },
   },
    {_id:false}
 );

 const cartSchema = new mongoose.Schema({
user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    required:true,
    unique:true,// one cart per user
},
 items:[cartItemSchema],
 },{timestamps:true}
);
module.exports =mongoose.model("Cart",cartSchema)
