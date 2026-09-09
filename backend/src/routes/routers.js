
const express = require('express');
const router = express.Router();
const user = require('../models/users');
const Message = require('../models/message');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

var storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "./uploads/")
    },
    filename: function(req, file, cb){
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
var upload = multer({
    storage: storage
}).single('image');

router.get('/user-register', authMiddleware, (req, res) => {
    user.find()
    .select('-password -confirmPassword')
    .then((data) =>{
        res.json(data)
    }).catch((error) =>{
        res.send({
            message : error.message,
            status: 500
        })
    })
})

router.post('/user-register',upload, async (req,res) =>{
    try {
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;
        const image = req.file
            ? `/uploads/${req.file.filename}`
            : (req.body.image || null);

        if(password === confirmPassword){
            const userRegister = new user({
                name : req.body.name,
                email: req.body.email,
                password: password,
                confirmPassword: confirmPassword,
                phone: req.body.phone,
                image: image,
                location: req.body.location
            })
            const chatUser = await userRegister.save();
            console.log("Successfully register :" , chatUser)
            res.json({
                message: "Successfully register",
                status: 200
            })
        }else{
            console.log("password are not match")
            res.json({
                message: "password are not match",
                status:500
            })
        }
    } catch (error) {
        res.send({
            message: "Not register",
            status: 500
        })
    }
})

router.post('/login',async (req,res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await user.findOne({email: email})
        if (!userData) {
            return res.status(401).json({
                message: "Invalid Details",
                status: 401
            })
        }

        const passwordMatch = await bcrypt.compare(password, userData.password);
        if(passwordMatch){
            const token = jwt.sign(
                {
                    id: userData._id,
                    name: userData.name,
                    email: userData.email,
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
            );

            const safeUser = userData.toObject();
            delete safeUser.password;
            delete safeUser.confirmPassword;

            console.log("Login Successfull", safeUser.name)
            res.json({
                message: "Login Successfull",
                status: 200,
                token: token,
                userData : safeUser
            })
        }else{
            res.status(401).json({
                message: "password are not match",
                status: 401
            })
        }
    } catch (error) {
        res.status(500).json({
            message: "Invalid Details",
            status: 500
        })
    }
})

router.get('/message', authMiddleware, (req,res) => {
    Message.find()
    .then((Data) => {
        res.json({
            Data : Data,
            status:200
        })
    }).catch((error) => {
        res.json({
            message: error.message,
            status: 500
        })
    })
})

router.post('/message', authMiddleware, async (req, res) =>{
    try {
        const name = req.body.name;
        const message = req.body.message;
        const chatmsg = new Message({name, message});
        const chatmessage = await chatmsg.save();
        console.log('successfully insert Chat message : ' , chatmessage);
        res.json({
            message: 'successfully insert Chat message',
            data: chatmessage,
            status: 200
        })
    } catch (error) {
        res.send({
            error : error.message,
            status: 500
        })
    }
})

module.exports = router
