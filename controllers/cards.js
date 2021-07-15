exports.card = (req, res) => {
  try {
    console.log(req.body);
    return res.render("gamepage", {
      message: "Start",
    });
  } catch (err) {
    console.log(err);
  }
};
