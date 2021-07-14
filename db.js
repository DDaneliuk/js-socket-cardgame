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
        const createUserTable = `CREATE TABLE IF NOT EXISTS users (
            id int(10) unsigned NOT NULL AUTO_INCREMENT,
            login varchar(50) NOT NULL UNIQUE,
            email varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
            password varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY email (email)
          ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
        connection.query(createUserTable)
        console.log("Successfully connected to MySQL");
    }
});

module.exports = connection;