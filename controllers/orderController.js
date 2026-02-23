const Order= require("../models/orderModel");
const Cart=require("../models/cartModel");

//create Order from Cart
const createOrder = async (req, res) => {
  try {
    const { address, city, postalCode, country } = req.body;

    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    //  STOCK VALIDATION
    for (const item of cart.items) {
      if (item.quantity > item.product.stock) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.product.name}`,
        });
      }
    }

    //  CALCULATE TOTAL
    const totalPrice = cart.items.reduce(
      (acc, item) => acc + (item.product.price * item.quantity),
      0
    );

    //  PREPARE ORDER ITEMS
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));

    //  REDUCE STOCK
    for (const item of cart.items) {
      item.product.stock -= item.quantity;
      await item.product.save();
    }

    //  CREATE ORDER
    console.log("TOTAL TYPE:", typeof totalPrice);
console.log("TOTAL VALUE:", totalPrice);
    const order = await Order.create({
      user: req.user._id,
      orderItems,
      shippingAddress: { address, city, postalCode, country },
      totalPrice,
    });

    //  CLEAR CART
    cart.items = [];
    await cart.save();

    res.status(201).json(order);

  } catch (error) {
    console.error("ORDER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

//GET Logged-in user  orders

const getmyOrders = async (req,res)=>{
    try{
        const orders = await Order.find({user:req.user._id});
        res.json(orders);

    }catch(error){
        res.status(500).json({message:error.message});
    }
};

module.exports = {
    createOrder,
    getmyOrders,
    
}