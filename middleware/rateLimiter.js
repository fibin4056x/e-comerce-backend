const rateLimiter=require("express-rate-limit");

/* =========================
   GENERAL API LIMITER
========================= */
const apiLimiter = rateLimiter({
    windowMs:15*60*1000,
    max:100,
    message:{
        message:"Top many request, please try again later"
    },
    standardHeaders:true,
    legacyHeaders:false
});

/* =========================
   AUTH LIMITER (STRICT)
========================= */

const authLimiter = rateLimiter({
    windowMs:10*60*1000,
    max :10,
    message:
    {message:" Too many login attempts"}

})

module.exports ={
    apiLimiter,
    authLimiter
};