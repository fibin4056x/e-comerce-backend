const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
  username:{
    type:String,
    required:true,
    trim:true,
    lowercase:true // normalize
  },

  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true
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
    default:false,
    index:true
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
    default:null,
    index:true
  },

  isVerified:{
    type:Boolean,
    default:false
  },

  otpAttempts:{
    type:Number,
    default:0,
    min:0,
    max:10
  }

},{timestamps:true});


/* =========================
   HASH PASSWORD
========================= */

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  if (!this.password) {
    throw new Error("Password is required");
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


/* =========================
   MATCH PASSWORD 
========================= */

userSchema.methods.matchPassword = async function(password){
  if (!password || !this.password) return false;
  return await bcrypt.compare(password, this.password);
};


/* =========================
   HASH OTP
========================= */

userSchema.methods.hashOTP = async function(otp){
  if (!otp) throw new Error("OTP is required");

  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
};


/* =========================
   VERIFY OTP
========================= */

userSchema.methods.verifyOTP = async function(enteredOTP){

  if (!this.otp || !enteredOTP) return false;

  return await bcrypt.compare(enteredOTP, this.otp);

};


module.exports = mongoose.model("User", userSchema);
