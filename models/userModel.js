const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
  username:{
    type:String,
    required:true,
    trim:true
  },

  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true
  },

  password:{
    type:String,
    required:true,
    minlength:6
  },

  profileImage:{
    type:String,
    default:""
  },

  role:{
    type:String,
    enum:["customer","admin"],
    default:"customer"
  },

  isBanned:{
    type:Boolean,
    default:false
  },

  refreshToken:{
    type:String,
    default:null
  },

  otp:{
    type:String,
    default:null
  },

  otpExpires:{
    type:Date,
    default:null
  },

  isVerified:{
    type:Boolean,
    default:false
  },

  otpAttempts:{
    type:Number,
    default:0
  }

},{timestamps:true});


/* =========================
   HASH PASSWORD
========================= */

userSchema.pre("save", async function () {

  // Only hash password if changed
  if(!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

});


/* =========================
   MATCH PASSWORD
========================= */

userSchema.methods.matchPassword = async function(password){
  return await bcrypt.compare(password, this.password);
};


/* =========================
   HASH OTP
========================= */

userSchema.methods.hashOTP = async function(otp){
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};


/* =========================
   VERIFY OTP
========================= */

userSchema.methods.verifyOTP = async function(enteredOTP){

  if(!this.otp) return false;

  return await bcrypt.compare(enteredOTP, this.otp);

};


module.exports = mongoose.model("User", userSchema);