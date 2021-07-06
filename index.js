const express = require("express");
const path = require("path");
const exphbs = require("express-handlebars");
const sesion = require("express-session");
const homeRoutes = require("./routes/home");
const signupRoutes = require("./routes/signup");
const loginRoutes = require("./routes/login");
const gamePageRoutes = require("./routes/gamepage");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server); // docs: https://socket.io/docs/v3/server-initialization/

const hbs = exphbs.create({
  defaultLayout: "main",
  extname: "hbs",
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", "views");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", homeRoutes);
app.use("/signup", signupRoutes);
app.use("/login", loginRoutes);
app.use("/gamepage", gamePageRoutes);

function generateRandomString(length) {
  let randomChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345678";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += randomChars.charAt(
      Math.floor(Math.random() * randomChars.length)
    );
  }

  return result;
}

// const roomStr = generateRandomString(16);

const socketRooms = new Map();
const userAtRooms = new Map();

io.on("connection", async (socket) => {
  const sid = socket.id;
  const rid = generateRandomString(16);

  console.log("socket connected: ", sid);

  // todo: socket.join(rid)

  if (socketRooms.size === 0 && userAtRooms.size === 0) {
    console.log("create");
    socketRooms.set(rid, {
      usersCount: 1,
      isRoomPlayable: false,
      players: new Map().set(sid, {
        isUserReady: true,
      }),
    });

    userAtRooms.set(sid, rid);
  } else {
    console.log("for of");
  }

  console.log("(conect) socketRooms: ", socketRooms);
  console.log("(conect) userAtRooms: ", userAtRooms);

  socket.on("user-ready", (msg) => {
    console.log("d1 event, data: ", msg);
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected, id: ", socket.id);

    const rid = userAtRooms.get(socket.id);

    // todo: socket.leave(rid)

    userAtRooms.delete(socket.id);
    socketRooms.delete(rid);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
