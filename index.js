const express = require('express');
const path = require("path");
const exphbs = require('express-handlebars');
const sesion = require('express-session');
const homeRoutes = require('./routes/home')
const signupRoutes = require('./routes/signup')
const loginRoutes = require('./routes/login')

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server); // docs: https://socket.io/docs/v3/server-initialization/

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

const socketRooms = new Map();

io.on('connection', async socket => {
  const sid = socket.id;

  console.log("socket connected: ", sid);

  socket.emit("huy", "ti loh!")

  socket.on("d1", msg => {
    console.log("d1 event, data: ", msg);
  })

  socket.on("d2", msg => {
    console.log("d2 event, data: ", msg);
  })

  socket.on("disconnect", () => {
    console.log("socket disconnected, id: ", socket.id);
  })
})

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})