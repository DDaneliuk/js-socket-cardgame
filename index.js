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
  const generatedRoomId = generateRandomString(16);

  console.log("socket connected: ", sid, " gen rid: ", generatedRoomId);

  // todo: socket.join(rid)

  let isRoomFounded = false;

  if (socketRooms.size === 0 && userAtRooms.size === 0) {
    socketRooms.set(generatedRoomId, {
      usersCount: 1,
      isRoomPlayable: false,
      players: new Map().set(sid, {
        isUserReady: false,
      }),
    });

    userAtRooms.set(sid, generatedRoomId);

    socket.join(generatedRoomId);
  } else {
    let localeRid;

    // searching for free room (where userCount is 1)
    for (let [key, value] of socketRooms) {
      if (value.usersCount === 1) {
        localeRid = key;
        isRoomFounded = true;

        // add new player to socketRooms (list of socket rooms)
        socketRooms.set(localeRid, {
          usersCount: 2,
          isRoomPlayable: false,
          players: socketRooms.get(localeRid).players.set(sid, {
            isUserReady: false,
          }),
        });

        // add current socket to specific room
        userAtRooms.set(sid, localeRid);

        socket.join(localeRid);
        break;
      }
    }
  }
  // if free room not found, we create new one and add current user (sid, socket) to this room
  if (isRoomFounded === false) {
    socketRooms.set(generatedRoomId, {
      usersCount: 1,
      isRoomPlayable: false,
      players: new Map().set(sid, {
        isUserReady: false,
      }),
    });

    userAtRooms.set(sid, generatedRoomId);

    socket.join(generatedRoomId);
  }

  console.log("(conect) socketRooms: ", socketRooms);
  console.log("(conect) userAtRooms: ", userAtRooms);

  socket.on("user-ready", () => {
    const localeGettedRid = userAtRooms.get(sid);
    const currentRoom = socketRooms.get(localeGettedRid);

    socketRooms.set(localeGettedRid, {
      usersCount: currentRoom.usersCount,
      isRoomPlayable: currentRoom.isRoomPlayable,
      players: currentRoom.players.set(sid, { isUserReady: true }),
    });

    if (currentRoom.players.size === 2) {
      socketRooms.set(localeGettedRid, {
        usersCount: currentRoom.usersCount,
        isRoomPlayable: true,
        players: currentRoom.players,
      });

      let isPizdanulos = false;

      for (let [key, value] of currentRoom.players) {
        console.log("for, val: ", value);
        if (value.isUserReady === false) {
          isPizdanulos = true;
          break;
        }
      }
      if (isPizdanulos === false) {
        io.to(localeGettedRid).emit("game-ready", localeGettedRid);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected, id: ", socket.id);

    const rid = userAtRooms.get(socket.id);

    userAtRooms.delete(socket.id);
    socketRooms.delete(rid);

    socket.leave(rid);

    console.log("(disconnect) socketRooms: ", socketRooms);
    console.log("(disconnect) userAtRooms: ", userAtRooms);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
