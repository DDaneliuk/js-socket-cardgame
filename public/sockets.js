let readyBtn = document.querySelector("#test");
const socket = io.connect("127.0.0.1:3000");

socket.on("second-user connected", (username) => {
  console.log("socekt server event data: ", msg);
});
socket.on("game-ready", (rid) => {
  console.log("game started, rid: ", rid);
});

readyBtn.addEventListener("click", () => {
  socket.emit("user-ready");
});
