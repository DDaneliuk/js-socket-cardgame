const db = require('../db');
const bcrypt = require('bcrypt');

module.exports = {
    getUser: function(email, callback){
        let sql = 'SELECT * FROM users WHERE email = ?';
        db.query(sql, email, function(err, result){
            callback(err, result)
        })
    },
    insertUser: async function(email, login, password, callback){
        let hashPass = await bcrypt.hash(password, 8);
        let sql = 'INSERT INTO users SET ?'
        db.query(sql, {email, login, password: hashPass}, function(err, result){
            callback(err, result)
        })
    },
}