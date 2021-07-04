const mysql = require("mysql2");
const config = require("../config.json");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require("../models/user")

exports.signup =  (req, res) => {    
    const {email, password, confirmpass} = req.body
    User.getUser(email, function (err, result){
        if (err){
            console.log(err);
        }
        if (result.length > 0){
            return res.render('signup', {
                message: 'That email is already in use'
            })
        }
        else if (password !== confirmpass) {
            return res.render('signup', {
                message: 'Wrong confirm pass. Try again'
            });
        }
        User.insertUser(email, password, function(err, result){
            if (err){
                console.log(err);
            } else {
                return res.render('signup', {
                    successmessage: 'Congracts, you are sign up!', signup: true})
            }
        })
    })
}

exports.login = (req, res) => {
    const {email, password} = req.body
    if(email && password){
        User.getUser(email, async function (err, result){
            if (err) console.log(err);
            console.log(result[0].password);
            if (!result || !(await bcrypt.compare(password, result[0].password))){
                return res.render('login', {
                    message: `Sorry, your pass or email is wrong. Try again`
                });
            } else{
                return res.render('login', {
                    message: 'Congracts, you are login in'
                })
            }
        })
    } else {
        return res.render('login', {
            message: 'Fill all fields'
        })
    }
}