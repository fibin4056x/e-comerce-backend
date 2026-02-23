const mongoose=require("mongoose");

const productSchema= new mongoose.Schema({
    name:{type: String, require: true},
    brand:String,
    category:String,
    type:String,
    description:String,
    price:{type:Number,require:true},
    originalPrice:Number,
    sizes:[Number],
    color:[String],
    images:[String],
    stock:Number,
    rating:{type:Number,default:0},
    reviews:{type:Number,dafault:0},
    discount:{type:Number,default:0},
    isFeatured:{type:Boolean,default:false},
    isNewArrival:{type:Boolean,default:false}


},{timestamps:true})

module.exports=mongoose.model("Product",productSchema);