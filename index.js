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
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
}); // docs: https://socket.io/docs/v3/server-initialization/

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
// added for easy search of available room
const socketRoomIndex = []

io.on("connection", async (socket) => {
  const sid = socket.id;

  // searching for free room (where userCount is 1)
  const readyToJoinRoomId = socketRoomIndex[0]
  if(socketRooms.size && readyToJoinRoomId) {
    // add new player to an available socketRoom
    const currentRoom = socketRooms.get(readyToJoinRoomId);
    socketRooms.set(readyToJoinRoomId, {
      ...currentRoom,
      usersCount: 2,
      isRoomPlayable: false,
    });
    currentRoom.players.set(sid, {
      isUserReady: false,
    });

    // add current socket to specific room
    socket.join(readyToJoinRoomId);
    // add current socket to specific room
    userAtRooms.set(sid, readyToJoinRoomId);
    // remove from array of available rooms
    socketRoomIndex.shift();
  } else {
    // create new room
    const generatedRoomId = generateRandomString(16);
    console.log("socket connected: ", sid, " gen rid: ", generatedRoomId);
    
    socketRooms.set(generatedRoomId, {
      usersCount: 1,
      isRoomPlayable: false,
      players: new Map().set(sid, {
        isUserReady: false,
      }),
    });
    socket.join(generatedRoomId);
    // add current socket to specific room
    userAtRooms.set(sid, generatedRoomId);
    // add to array of available to join rooms
    socketRoomIndex.push(generatedRoomId)
  }
  console.log("(conect) socketRooms: ", socketRooms);
  console.log("(conect) userAtRooms: ", userAtRooms);
  
  socket.on("user-ready", () => {
    console.log("user-ready emitted: ", sid)
    // find which room a user have previously joined
    const roomId = userAtRooms.get(sid);
    const currentRoom = socketRooms.get(roomId);

    const currentPlayer = currentRoom.players.get(sid);
    // second player is the guy with diff sid in the room
    const secondPlayerId = [...currentRoom.players.keys()].find(x => x !== sid);
    const secondPlayer = currentRoom.players.get(secondPlayerId);

    currentRoom.players.set(sid, {
      ...currentPlayer,
      isUserReady: true 
    })

    if (currentRoom.players.size === 2 && secondPlayer.isUserReady) {
      // room is ready
      socketRooms.set(roomId, {
        ...currentRoom,
        isRoomPlayable: true,
      });

      io.to(roomId).emit("game-ready", roomId);
      console.log("(game-ready) socketRooms: ", socketRooms);
    }
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected, id: ", socket.id);
    const roomId = userAtRooms.get(socket.id);
    const currentRoom = socketRooms.get(roomId)
    userAtRooms.delete(socket.id);
    
    // only delete room if there are no users left
    if(currentRoom && currentRoom.players && currentRoom.players.size > 1) {
      currentRoom.players.delete(sid)
      // room becomes unplayable
      socketRooms.set(roomId, {
        ...currentRoom,
        usersCount: 1,
        isRoomPlayable: false,
      });
      // and becomes available to join
      socketRoomIndex.push(roomId)
    } else {
      socketRooms.delete(roomId);
      // cleanup rooms available to join
      const index = socketRoomIndex.indexOf(roomId);
      if (index !== -1) {
        socketRoomIndex.splice(index, 1);
      }
    }

    socket.leave(roomId);

    console.log("(disconnect) socketRooms: ", socketRooms);
    console.log("(disconnect) userAtRooms: ", userAtRooms);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
