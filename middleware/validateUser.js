const {body ,validationResult}= require("express-validator");

 const handlevalidation=  (req,res, next)=>{
    const errors =validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({
            errors:errors.array()
        });

    }
    next();
   }

const validateRegister=[
    body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
   .isLength({min:4}).withMessage("Username must be atleast 4 chaaracters"),
    
   body("email")
   .trim()
   .notEmpty().withMessage("Email is required")
   .isEmail().withMessage("Invalidate email format"),

   body("password")
   .notEmpty()
   .withMessage("Password is required")
   .isLength({min:6}).withMessage("password must be  at least 6 characters")
   .matches(/[0-9]/).withMessage("Password must contain at least one number"),

  handlevalidation
];

const validateLogin =[
    body("email")
    .trim()
    .notEmpty().withMessage("email is required")
    .isEmail().withMessage("invalid email format"),

    body("password")
    .notEmpty().withMessage("Password is required"),

    handlevalidation
]

module.exports ={validateRegister,validateLogin};
