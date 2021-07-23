const express = require("express");
const path = require("path");
const exphbs = require("express-handlebars");
const sesion = require("express-session");
const homeRoutes = require("./routes/home");
const signupRoutes = require("./routes/signup");
const loginRoutes = require("./routes/login");
const gamePageRoutes = require("./routes/gamepage");
const cardsRoutes = require("./routes/cards");
const allCards = require("./allCards.json")

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
app.use("/cards", cardsRoutes);

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


// HELPER functions
/**
 * Object.entriesFrom() polyfill
 * @author Chris Ferdinandi
 * @license MIT
 */
 if (!Object.fromEntries) {
	Object.fromEntries = function (entries){
		if (!entries || !entries[Symbol.iterator]) { throw new Error('Object.fromEntries() requires a single iterable argument'); }
		let obj = {};
		for (let [key, value] of entries) {
			obj[key] = value;
		}
		return obj;
	};
}

const randomSelection = (originalArray, n) => {
  let newArr = [];
  if (n >= originalArray.length) {
    return originalArray;
  }
  for (let i = 0; i < n; i++) {
    let newElem = originalArray[Math.floor(Math.random() * originalArray.length)];
    while (newArr.includes(newElem)) {
      newElem = originalArray[Math.floor(Math.random() * originalArray.length)];
    }
    newArr.push(newElem);
  }
  return newArr;
}

// const roomStr = generateRandomString(16);

const socketRooms = new Map();
const userAtRooms = new Map();
// added for easy search of available room
const socketRoomIndex = []

const userIntervals = new Map();

class Game {
  constructor(emit, id, player) {
    this.emit = emit
    this[id] = {
      ...player,
      cards: randomSelection(allCards, 3)
    };
    this.playerIds = [id]
    this.currentTurn = id
    this.interval;
  }
  // Getter
  getMe(sid) {
    return this[sid];
  }
  addPlayer(id, player) {
    this.playerIds.push(id)
    this[id] = {
      ...player,
      cards: randomSelection(allCards, 3)
    };
    // reset cards to other player too
    const otherPlayerId = this.playerIds.filter(x => x !== id)
    if(otherPlayerId) {
      this[otherPlayerId] = {
        ...this[otherPlayerId],
        cards: randomSelection(allCards, 3)
      };
    }
    
    this.currentTurn = id
    if(this.playerIds.length === 2 && !this.intervalId) {
      // start first turn
      this.startTimer()
    }
  }
  removePlayer(id) {
    this.playerIds = this.playerIds.filter(x => x !== id)
    delete this[id];
    this.resetCards()
  }
  checkBalances() {
    const self = this
    const moneyLost = []
    this.playerIds.map(x => {
      const player = self[x]
      let allGood = false
      player.cards.map(y => {
        if(y.cost <= player.money) allGood = true
      })
      if(!allGood && !player.currentCard) {
        moneyLost.push(x)
      }
    })
    if(moneyLost.length === 2) {
      self.lostTheGame(moneyLost[0], true, 'tie')
    } else if (moneyLost.length === 1) {
      self.lostTheGame(moneyLost[0], true)
    }
  }
  switchTurn() {
    const otherTurn = this.playerIds.find(x => x !== this.currentTurn)
    this.currentTurn = otherTurn

    const player1 = this[this.currentTurn]
    const player2 = this[otherTurn]
    // check balances on each turn
    this.emit("switchTurn", [this]);
    this.clearTimer()
    this.startTimer()
  }
  startTimer() {
    // this is the amount of seconds per turn
    this.timeLeft = 30

    const interval = setInterval(() => {
      if(this.timeLeft <= 1 || !this.timeLeft) {
        clearInterval(userIntervals.get(this.intervalId))
        userIntervals.delete(this.intervalId);
        // because of timeout
        this.resetCards()
        this.switchTurn()
      }
      this.tick()
    }, 1000)
    const generatedIntervalId = generateRandomString(16);
    this.intervalId = generatedIntervalId
    userIntervals.set(generatedIntervalId, interval)
  }
  clearTimer() {
    // clear timer for all players if one disconnects
    clearInterval(userIntervals.get(this.intervalId))
    delete this.intervalId
  }

  tick() {
    this.timeLeft--
    this.emit("tick", [this.timeLeft]);
  }
  playTheCard(id, card) {
    const me = this[this.currentTurn]
    // can I afford it?
    if((me.money - parseInt(card.cost)) >= 0) {
      me.currentCard = card
      me.money = me.money - parseInt(card.cost)
      me.cards = me.cards.filter(x => x.id !== card.id)
      this.getNewCard(this.currentTurn)
    } else {
      // emit event to reset the card
      this.checkBalances()
      return
    }
    this.emit("cardMoved", [this, this.currentTurn, card]);

    const otherPlayerId = this.playerIds.filter(x => x !== this.currentTurn)
    const otherPlayer = this[otherPlayerId]
    if(me.currentCard) {

      if(otherPlayer.currentCard) {
        // do a damage
        const damageToMe = parseInt(otherPlayer.currentCard.damage) - parseInt(card.defence)
        const damageFromMe = parseInt(card.damage) - parseInt(otherPlayer.currentCard.defence)

        if(me.health - damageToMe > 0) {
          // still alive
          me.health = me.health - damageToMe
        } else {
          // lost
          this.lostTheGame(this.currentTurn)
        }

        if(otherPlayer.health - damageFromMe > 0) {
          // still alive
          otherPlayer.health = otherPlayer.health - damageFromMe
        } else {
          // lost
          this.lostTheGame(otherPlayerId)
        }
        // grab new cards for both
        this.resetCards()
      }
      this.switchTurn()
    }
    return this
  }
  getNewCard(id) {
    const current = this[id]
    if(current.cards.length !== 3) {
      current.cards = [...current.cards.filter(y => y.id !== current.currentCard.id), ...randomSelection(allCards, 1)]
    }
  }
  resetCards() {
    this.playerIds.map(x => {
      delete this[x].currentCard
    })
  }
  lostTheGame(looserId, moneyReason, tie) {
    this.emit("lost", [this, looserId, moneyReason, tie]);
  }
}

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
  // console.log("(conect) socketRooms: ", socketRooms);
  // console.log("(conect) userAtRooms: ", userAtRooms);
  
  socket.on("user-ready", (arg1) => {
    const {name, email} = arg1
    console.log("user-ready emitted: ", sid, arg1)
    // find which room a user have previously joined
    const roomId = userAtRooms.get(sid);
    const currentRoom = socketRooms.get(roomId);

    const currentPlayer = currentRoom.players.get(sid);
    // second player is the guy with diff sid in the room
    const secondPlayerId = [...currentRoom.players.keys()].find(x => x !== sid);
    const secondPlayer = currentRoom.players.get(secondPlayerId);

    currentRoom.players.set(sid, {
      ...currentPlayer,
      name: name,
      email: email,
      isUserReady: true 
    })

    if(!currentRoom.game) {
      socketRooms.set(roomId, {
        ...currentRoom,
        game: new Game(
          (name, args) => io.to(roomId).emit(name, ...args),
          sid, 
          {
            health: 100,
            money: 125,
            name: name,
            email: email
          }
        )
      });
    } else {
      currentRoom.game.addPlayer(
        sid, 
        {
          health: 100,
          money: 125,
          name: name,
          email: email
        }
      )
    }


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

  socket.on("getGameInfo", (callback) => {
    console.log("getGameInfo emitted: ", sid)
    const roomId = userAtRooms.get(sid);
    const currentRoom = socketRooms.get(roomId);
    callback({
      ...currentRoom,
      players: Object.fromEntries(currentRoom.players)
    })
  });

  socket.on("switchTurn", (callback) => {
    console.log("switchTurn emitted: ", sid)
    const roomId = userAtRooms.get(sid);
    const currentRoom = socketRooms.get(roomId);
    currentRoom.game && currentRoom.game.switchTurn()
    callback({
      ...currentRoom,
      players: Object.fromEntries(currentRoom.players)
    })
  });

  socket.on("cardIsPlayed", (cardId, callback) => {
    console.log("cardIsPlayed emitted: ", sid, cardId)
    const card = allCards.find(x => x.id == cardId)
    const roomId = userAtRooms.get(sid);
    const currentRoom = socketRooms.get(roomId);
    currentRoom.game && currentRoom.game.playTheCard(sid, card)
    callback({
      ...socketRooms.get(roomId),
      players: Object.fromEntries(socketRooms.get(roomId).players)
    })
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
      if(currentRoom.game) {
        currentRoom.game.removePlayer(sid)
        currentRoom.game.clearTimer()
      }
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
    io.to(roomId).emit("player-left", roomId);
    socket.leave(roomId);

    console.log("(disconnect) socketRooms: ", socketRooms);
    console.log("(disconnect) userAtRooms: ", userAtRooms);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
