const Product =require("../models/productModel");
//GET all product
const getProducts = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = {};

    if (category) {
      filter.category = new RegExp(`^${category}$`, "i"); // case-insensitive
    }

    console.log("🔍 Filter:", filter);

    const products = await Product.find(filter);

    console.log("✅ Products found:", products.length);

    res.status(200).json(products);
  } catch (error) {
    console.error("🔥 Product Fetch Error:", error);
    res.status(500).json({ message: error.message });
  }
};

//get  product by id

const getProductsbyId=async(req,res)=>{
    try{
        const productById=await Product.findById(req.params.id);
        res.status(200).json(productById);
    }catch(errror){
        res.status(500).json({message:error.message})
    }
}

//create products

const createProduct = async (req, res, next) => {
  try {
    console.log("📦 Incoming product data:", req.body);

    // Validate required fields
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({
        message: "Name and price are required",
      });
    }

    // Handle image uploads safely
    let imagePaths = [];

    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(
        (file) => `/uploads/${file.filename}`
      );
    }

    // Parse variants safely (because sent as JSON string from frontend)
    let parsedVariants = [];

    if (req.body.variants) {
      try {
        parsedVariants = JSON.parse(req.body.variants);
      } catch (err) {
        return res.status(400).json({
          message: "Invalid variants format",
        });
      }
    }

    const product = new Product({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      type: req.body.type,
      description: req.body.description,
      price: Number(req.body.price),
      originalPrice: Number(req.body.originalPrice) || 0,
      discount: Number(req.body.discount) || 0,
      isFeatured: req.body.isFeatured === "true",
      isNewArrival: req.body.isNewArrival === "true",
      images: imagePaths,
      variants: parsedVariants,
    });

    const savedProduct = await product.save();

    console.log("✅ Product created:", savedProduct._id);

    res.status(201).json(savedProduct);

  } catch (error) {
    console.error("❌ Create Product Error:", error.message);
    next(error); // send to global error handler
  }
};
//updateproduct

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.name = req.body.name || product.name;
    product.brand = req.body.brand || product.brand;
    product.category = req.body.category || product.category;
    product.type = req.body.type || product.type;
    product.description = req.body.description || product.description;
    product.price = req.body.price ?? product.price;
    product.stock = req.body.stock ?? product.stock;
    product.discount = req.body.discount ?? product.discount;
    product.isFeatured = req.body.isFeatured ?? product.isFeatured;
    product.isNewArrival = req.body.isNewArrival ?? product.isNewArrival;

    const updatedProduct = await product.save();

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
//delete
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.deleteOne();

    res.json({ message: "Product removed successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports={getProducts,createProduct,updateProduct,deleteProduct,getProductsbyId};