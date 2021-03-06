const { Router } = require("express");
const router = Router();
const gameController = require("../controllers/game");

router.get("/", (req, res) => {
  res.render("gamepage", {
    title: "Home",
    readyState: true,
    gameTemplate: true,
  });
});

router.post("/", gameController.startgame);

module.exports = router;
