const db = require("mysql2");
const config = require("./config.json")

const connection = db.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
})

connection.connect(function(err){
    if(err){
        return console.log("Error: " + err.message);
    } else {
        console.log("Successfully connected to MySQL");
    }
});

module.exports = connection;