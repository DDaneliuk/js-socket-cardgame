const { Router } = require("express");
const router = Router();
const authController = require("../controllers/auth");

router.get("/", (req, res) => {
  res.render("gamepage", {
    title: "Home",
  });
});

router.post("/", authController.login);

module.exports = router;
