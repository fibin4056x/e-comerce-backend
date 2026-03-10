const User = require("../models/userModel");

/* GET ALL USERS */

const getAllUsers = async (req,res)=>{
  try{

    const users = await User.find().select("-password").lean();

    res.json(users);

  }catch(error){
    res.status(500).json({message:error.message});
  }
};


/* CHANGE ROLE */

const updateUserRole = async (req,res)=>{
  try{

    const user = await User.findById(req.params.id);

    if(!user)
      return res.status(404).json({message:"User not found"});

    user.role = req.body.role;

    await user.save();

    res.json({message:"Role updated",role:user.role});

  }catch(error){
    res.status(500).json({message:error.message});
  }
};


/* BAN / UNBAN USER */

const toggleBan = async (req,res)=>{
  try{

    const { banned } = req.body;

    const user = await User.findById(req.params.id);

    if(!user)
      return res.status(404).json({message:"User not found"});

    user.isBanned = banned;

    await user.save();

    res.json({
      message:banned ? "User banned":"User unbanned",
      isBanned:user.isBanned
    });

  }catch(error){
    res.status(500).json({message:error.message});
  }
};


/* DELETE USER */

const deleteUser = async (req,res)=>{
  try{

    await User.findByIdAndDelete(req.params.id);

    res.json({message:"User deleted"});

  }catch(error){
    res.status(500).json({message:error.message});
  }
};


module.exports={
  getAllUsers,
  updateUserRole,
  toggleBan,
  deleteUser
};