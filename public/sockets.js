let readyBtn = document.querySelector("#test");
const socket = io.connect("127.0.0.1:3000");

socket.on("second-user connected", (username) => {
  console.log("socekt server event data: ", msg);
});

readyBtn.addEventListener("click", () => {
  socket.emit("user-ready");
});
