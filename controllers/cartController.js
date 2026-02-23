const Cart = require("../models/cartModel");
const Product = require("../models/productModel");

// 🔹 Add to Cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const qty= quantity||1;
   //stock check before adding
   if(qty >product.stock){
    return res.status(400).json({
      message: `Only ${product.stock} items available in stock`,
    })
   }
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, quantity: quantity || 1 }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
      const newQuantity=  cart.items[itemIndex].quantity +qty;

       //check again if updating
       if(newQuantity>product.stock){
        return res.status(400).json({
          message:`Only ${product.stock} items available in stock`,
        })
       }
      } else {
        cart.items.push({ product: productId, quantity: qty});
      }

      await cart.save();
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Get Cart
const getUserCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product");

    if (!cart) {
      return res.json({ items: [], total: 0 });
    }

    const total = cart.items.reduce((acc, item) => {
      return acc + item.product.price * item.quantity;
    }, 0);

    res.json({
      ...cart.toObject(),
      total,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Update Quantity
const updateCartItem=async(req,res)=>{
  try{
    const {productId,quantity}=req.body;

    const cart =await Cart.findOne({user:req.user._id});
    const  product =await Product.findById(productId);

    if(!product){
      return res.status(404).json({message:"product not found"});
    }
    if(!product){
      return res.status(404).json({message: 'Product not found'})
    }
    if (quantity > product.stock){
      return res.status(400).json({message:`Only ${product.stock} items available in stock`});
    }

    const itemIndex =cart.items.findIndex(
      (item)=>item.product.toString()=== productId
    );

    if(itemIndex===1){
      return res.status(404).json({message:"Product not in cart"});
    }
    cart.items[itemIndex].quantity =quantity;
    await cart.save();
    res.json(cart);
  }catch(error){
    res.status(500).json({message:error.message})
  }
};

// 🔹 Remove Item
const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addToCart,
  getUserCart,
  updateCartItem,
  removeCartItem,
};