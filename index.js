const express = require('express');
const path = require("path");
const exphbs = require('express-handlebars');
const sesion = require('express-session');
const homeRoutes = require('./routes/home')
const signupRoutes = require('./routes/signup')
const loginRoutes = require('./routes/login')

const app = express();

const hbs = exphbs.create({
    defaultLayout: "main",
    extname: 'hbs'
})

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', 'views')
app.use(express.static('public'))
app.use(express.urlencoded({extended:true}))
app.use(express.json());

app.use('/', homeRoutes)
app.use('/signup', signupRoutes)
app.use('/login', loginRoutes)


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})