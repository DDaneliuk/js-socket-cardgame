let readyBtn = document.querySelector("#test");
const socket = io.connect("127.0.0.1:3000");

socket.on("game-ready", async (rid) => {
  console.log("game started, rid: ", rid);
});

readyBtn.addEventListener("click", () => {
  console.log("BTN");
  socket.emit("user-ready");
});
