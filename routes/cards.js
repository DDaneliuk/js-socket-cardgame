const { Router } = require("express");
const router = Router();
const cardsController = require("../controllers/cards");

router.get("/", (req, res) => {
  res.render("cards", {
    title: "Cards",
  });
});

router.post("/", cardsController.card);

module.exports = router;
