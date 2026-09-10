const mongoose = require('mongoose');
const bcrypt = require("bcrypt")

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    
    },
    email:{
        type: String,
        
    },
    password:{
        type: String,
        
    },
    confirmPassword: {
        type: String,
        
    },
    phone:{
        type: String,
        unique: [true, 'please enter your unique phone number']
    },
    image:{
        type: String
    },
    location:{
        type: String,
        
    },
    message:{
        type: String
    },
    timestamp:{
        type: Date,
        default: Date.now
    },
    resetToken: {
        type: String,
        default: null,
    },
    resetTokenExpiry: {
        type: Date,
        default: null,
    },
});


userSchema.pre('save', async function(next){
    if(this.isModified("password")){
        this.password  = await bcrypt.hash(this.password,10);
        this.confirmPassword = await bcrypt.hash(this.confirmPassword,10);
    }
    next();
});


const user = new mongoose.model("user", userSchema);

module.exports = user;