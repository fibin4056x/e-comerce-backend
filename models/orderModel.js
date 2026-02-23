const mongoose =require("mongoose");

const orderItemShema =new mongoose.Schema({
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        required:true,
    },
    name:String,
    quantity:Number,
    price:Number,
});

const ordersChema =new mongoose.Schema({
    user:{
        type:mongoose.Types.ObjectId,
        ref:"User",
        require:true,

    },
    orderItems:[orderItemShema],
    shippingAddress:{
        address:String,
        city:String,
        postalCode:String,
        country:String,
    },

    totalPrice:{
        type:Number,
        required:true,
    },
    isPaid:{
        type:Boolean,
        default:false,
    },
    paidAt:Date,
    isDelivered:{
        type:Boolean,
        default:false
    },
    deliveredAt:Date,


},{timestamps:true});

module.exports =mongoose.model("Order",ordersChema);