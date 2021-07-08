const { Router } = require("express");
const router = Router();
const gameController = require("../controllers/game");

router.get("/", (req, res) => {
  res.render("gamepage", {
    title: "Home",
  });
});

router.post("/", gameController.startgame);

module.exports = router;
