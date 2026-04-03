const User =require("../models/userModel");
const Product = require("../models/productModel");
const Order =require("../models/orderModel");

/* Dashbord*/

const getDashbord =async (req, res)=>{
   try {
      const [ userCount,productCount,orderState] = Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Order.aggregate([
          {
            $facet:{
              totalOrders:[{$count:"count"}],
              deliverdOrder:[{$match:{status:"Delivered"}},{$count:"count"}],
              pendingOrder:[{$match:{status:"Pending"}},{$count:"count"}],
              cancelledOrder:[{$match:{status:"Cancelled"}},{$count:"count"}],
              revenue:[{$match:{status:"Delivered"}},{
                $group:{_id:null,total:{$sum:"$totalPrice"}}
              }]
            }
          }
        ])
      ]);
      const  stats = orderState[0]
        res.json({
          users:userCount,
          product:productCount,
          orders:stats.totalOrders[0]?.count||0,
          deliveredOrders:stats.deliverdOrder[0]?.count||0,
          pendingOrders:stats.pendingOrder[0]?.count||0,
          cancelledOrders:stats.cancelledOrder[0]?.count||0,
          revenue:stats.revenue[0]?.total||0,
        })
   } catch (error) {
    console.error("dashbord stats error " ,error)
    res.status(500).json({message:"server error"})
   }
}

/*monthly chart*/

const getMonthlyRevenue =async(req,res)=>{
 
  try {
   const revenue = await Order.aggregate([
    {$match:{status:"Delivered"}},
    {
      $group:{
        _id:{
          year:{$year:"$createAt"},
          month:{$month:"$createdAt"}
        },
        revenue:{ $sum:"$totalPrice"}
      }
    },
    {
      $sort:{
        "_id.year":1,"_id.month":1
      }
    }
   ]);

   res.json({revenue})
  } catch (error) {
    console.error("monthly revenue error:",error);
    res.status(500).json({message:"Server Error"})
    
  }
};

/*recent orders*/

const  getRecentOrders =async (req,res)=>{
  try{
    const page =parseInt(req.query.page)||1;
    const limit =parseInt(req.query.limit)||5;
    const skip =(page -1)*limit;

    const [orders, totalOrders]= await Promise.all([
      Order.find()
      .sort({createdAt :-1})
      .skip(skip)
      .limit(limit)
      .populate("user","username email")
      .lean(),

      Order.countDocuments()
    ]);

    res.json({
      orders,
      page,
      totalPages:Math.ceil(totalOrders/limit),
      totalOrders
    })
  }catch(error){
    console.error("Recent orders error",error)
    res.status(500).json({message:error});
  }
};

/*  top selling  products */

const getTopProduct =async(req, res)=>{
  try {
    const page =parseInt(req.query.page)||1;
    const limit =parseInt(req.query.limit)||5;
    const skip=(page-1)*limit;

    const product = await Order.aggregate([
      {$unwind:"$orderItems"},

      {$group:{
        _id:"$orderItems.product",
        totalSold:{$sum:"$orderItems.quantity"}
      }},{$sort:{totalSold:-1}},
      {$sort:{totalSold:-1}},
      {$skip:skip},
      {$limit:limit},
      {
        $lookup:{
          from:"products",
          localfield:"_id",
          foreignField:"_id",
          as:"product",
        }
      },
      {$unwind :"$product"},
      {
        $project:{
          _id:0,
          name:"$product.name",
          price:"$product.price",
          images:"$product.images",
          totalSold:1
        }
      }
    ]);
    res.json(products);

  } catch (error) {
    console.error(("Top Products Error:",error));
    res.status(500).json({message:"Server  Error"});
  }
}

module.exports= {
  getDashbord,
  getTopProduct,
  getRecentOrders,
  getMonthlyRevenue
}