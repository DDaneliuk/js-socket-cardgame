let gameIsReady;
let dragUnsetter;

function renderCard(cardData) {
  return `<div id="cardId-${cardData.id}" class="card">
      <h3 class="card-name">${cardData.name}</h3>
      <div>
          <img class="card-img" src="${cardData.img}"> 
      </div>

      <div class="card-info">
          <div class="card-opt">
              <img class="card-icon" src="../images/dagger.svg">
              <p class="damage">${cardData.damage}</p>
          </div>

          <p class="card-opt money">$${cardData.cost}</p>

          <div class="card-opt ">
              <img class="card-icon" src="../images/heart.svg">
              <p class="health">${cardData.defence}</p>
          </div>
      </div>
  </div>`
}

function renderSelectedCard(userId, cardData) {
  const placeholder = document.querySelector(`#${userId} .place-card`);
  if(!cardData) {
    placeholder.children[0].remove();
    placeholder.style.padding = "30px";
    placeholder.innerHTML = `<p>Place your card</p>`
    return
  }
  
  placeholder.children[0].remove();
  const original = renderCard(cardData)
  // const card = original.cloneNode( true )
  placeholder.innerHTML = original;
  // original.remove()
  placeholder.style.padding = "0";
  // original.style.margin = "0";
}

function setDrag(userId, callback) {
  // cleanup first
  if(dragUnsetter) dragUnsetter()
  const cards = document.querySelectorAll(`#${userId} .card`);
  const placeholder = document.querySelector(`#${userId} .place-card`);

  placeholder.addEventListener("dragover", dragover);
  placeholder.addEventListener("dragenter", dragenter);
  placeholder.addEventListener("dragleave", dragleave);
  placeholder.addEventListener("drop", dragdrop);

  cards.forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      setTimeout(() => e.target.classList.add("hide-card", "hold-card"), 0);
      pickCard = card;
    });
    card.addEventListener("dragend", dragend);
  });

  function dragend(e) {
    e.target.classList.remove("hold-card", "hide-card");
  }

  function dragover(e) {
    e.preventDefault();
  }

  function dragenter(e) {
    e.target.classList.add("hovered");
  }

  function dragleave(e) {
    e.target.classList.remove("hovered");
  }

  function dragdrop(e) {
    e.target.children[0].remove();
    e.target.style.padding = "0";
    e.target.append(pickCard);
    pickCard.style.margin = "0";
    // emit event
    callback(pickCard.id.replace("cardId-", ""))
  }
  // unset listeners on next turn
  dragUnsetter = () => {
    placeholder.removeEventListener("dragover", dragover);
    placeholder.removeEventListener("dragenter", dragenter);
    placeholder.removeEventListener("dragleave", dragleave);
    placeholder.removeEventListener("drop", dragdrop);
  }

}

window.addEventListener("load", function(event) {
  // wait for page to finish loading

  const readyBtn = document.querySelector("#test");
  const socket = io.connect("127.0.0.1:3000");

  const readyContainer = document.querySelector("#ready-container");
  const gameboard = document.querySelector("#gameboard");

  const cookies = document.cookie
  .split(';')
  .reduce((res, c) => {
    const [key, val] = c.trim().split('=').map(decodeURIComponent)
    const allNumbers = str => /^\d+$/.test(str);
    try {
      return Object.assign(res, { [key]: allNumbers(val) ?  val : JSON.parse(val) })
    } catch (e) {
      return Object.assign(res, { [key]: val })
    }
  }, {});
  console.log("cookies: ", cookies)

  function startGameBoard() {
    readyContainer.style.display = 'none'
    gameboard.style.display = 'block'
  }
  function resetGameBoard() {
    readyContainer.style.display = 'flex'
    gameboard.style.display = 'none'
  }
  function renderTurn(game) {
    // set turn and timer
    const turnOwner = game[game.currentTurn]
    console.log("turnOwner: ", turnOwner)
    const turn = document.querySelector("#turn");
    
    turn.innerHTML = turnOwner.name;
    if(socket.id === game.currentTurn) {
      // it's my turn
      document.querySelector("#user1").style.background = '#26002c'
      document.querySelector("#user2").style.background = '#161616'
    } else {
      // it's competitor's turn
      document.querySelector("#user1").style.background = '#161616'
      document.querySelector("#user2").style.background = '#26002c'
    }

    const callback = (cardId) => {
      socket.emit("cardIsPlayed", cardId, (gameData) => {
        console.log("My sid: ", socket.id)
        console.log("cardIsPlayed: ", gameData)
        reRender(gameData)
      });
    }
    if(socket.id === game.currentTurn) {
      // it's my turn
      setDrag('user1', callback)
    } else {
      // it's competitor's turn
      // always disabled
      // setDrag('user2', callback)
    }
    
  }

  function renderTimeLeft(timeLeft) {
    const timer = document.querySelector("#timer");
    timer.innerHTML = timeLeft;
  }

  function renderPlayerCards(userId, allCards) {
    document.querySelector(`#${userId} #cards`).innerHTML = allCards.map(x => renderCard(x))
  }

  function reRender(gameData) {
    if(gameData && !gameData.isRoomPlayable) {
      console.log("redirect to start: ", !gameData.isRoomPlayable)
      resetGameBoard()
    }

    if(gameData.isRoomPlayable && gameData.game && gameData.game[socket.id]) {
      // set correct names and points
      const myPlayer = gameData.game[socket.id]
      // show myself at the bottom at all times
      const user1Name = document.querySelector("#user1 .user-name");
      const user1Money = document.querySelector("#user1 .user-info .money");
      const user1Health = document.querySelector("#user1 .user-info .health");
      user1Name.innerHTML = myPlayer.name;
      user1Money.innerHTML = myPlayer.money;
      user1Health.innerHTML = myPlayer.health;
      renderPlayerCards('user1', myPlayer.cards)
      renderSelectedCard('user1', myPlayer.currentCard)
      // manage second player (competitor)
      const secondPlayerId = [...gameData.game.playerIds].find(x => x !== socket.id);
      const secondPlayer = gameData.game[secondPlayerId];

      const user2Name = document.querySelector("#user2 .user-name");
      const user2Money = document.querySelector("#user2 .user-info .money");
      const user2Health = document.querySelector("#user2 .user-info .health");
      user2Name.innerHTML = secondPlayer.name;
      user2Money.innerHTML = secondPlayer.money;
      user2Health.innerHTML = secondPlayer.health;
      renderPlayerCards('user2', secondPlayer.cards)
      renderSelectedCard('user2', secondPlayer.currentCard)

      renderTurn(gameData.game)
    }
  }
  function getGameData() {
    socket.emit("getGameInfo", (gameData) => {
      console.log("My sid: ", socket.id)
      console.log("getGameInfo: ", gameData)
      reRender(gameData)
    });
  }

  socket.on("tick", async (timeLeft) => {
    // console.log("Time is ticking: ", timeLeft);
    renderTimeLeft(timeLeft)
  });
  socket.on("switchTurn", async (game) => {
    console.log("Turn has switched: ", game);
    renderTurn(game)
  });

  socket.on("game-ready", async (rid) => {
    console.log("game started, rid: ", rid);
    gameIsReady = true;
    startGameBoard()
    getGameData()
  });
  // listen to players leaving the room
  socket.on("player-left", async (rid) => {
    console.log("player-left, rid: ", rid);
    resetGameBoard()
  });
  // listen to card moves
  socket.on("cardMoved", async (game, currentTurn, card) => {
    console.log("cardMoved: ", currentTurn, card);
    getGameData()
  });

  socket.on("lost", async (game, looserId, moneyReason, tie) => {
    console.log("lost: ", looserId);
    if(tie) {
      this.alert("You have both lost the game. Out of money.")
      location.reload();
      return
    }
    if(looserId === socket.id) {
      this.alert(`You have lost the game. ${moneyReason ? 'Out of money' : 'Fair and Square.'}`)
      location.reload();
      return
    } else {
      this.alert("You have won the game! Fair and Square.")
      location.reload();
      return
    }
  });

  // check if game is legit to continue
  if(window.location.pathname === '/gamepage') {
    getGameData()
  }

  // handle ready state update
  // socket.emit("user-ready", {name: cookies.userName, email: cookies.email});
  readyBtn.addEventListener("click", () => {
    console.log("BTN clicked");
    socket.emit("user-ready", {name: cookies.userName, email: cookies.email});
  });
  
});